/* pwm_generator.c
 * Generátor obdélníkového průběhu pomocí PWM (Raspberry Pi Pico / RP2040).
 * Ovládání klávesnicí 4x4, zobrazení na OLED displeji SSD1306 128x32 (I2C).
 *
 * Podle zadání https://sspvc.lixis.cz/pmp/pwn_generator_3.0/pwm_generator_v3.html,
 * zapojení podle schema/pwm_generator.kicad_sch:
 *
 *   Klávesnice 4x4   řádky   GPIO2..GPIO5  (pin 4, 5, 6, 7)
 *                    sloupce GPIO6..GPIO9  (pin 9, 10, 11, 12)
 *   OLED SSD1306     SDA = GPIO10 (pin 14), SCL = GPIO11 (pin 15)  -> I2C1
 *                    VCC = 3V3 (pin 36), GND = GND
 *   Výstup PWM       GPIO20 (pin 26) -> J1
 *   LED na desce     GPIO25 - svítí, když generátor běží
 *
 * Ovládání:
 *   A  ... zadávání kmitočtu [Hz]
 *   B  ... zadávání střídy [%]
 *   C  ... spustit generátor
 *   D  ... zastavit generátor
 *   0-9 .. číslice,  * ... smazat poslední číslici,  # ... smazat celé číslo
 */
#include "pico/stdlib.h"
#include "hardware/clocks.h"
#include "hardware/i2c.h"
#include "hardware/pwm.h"
#include "ssd1306.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// ---------------------------------------------------------------- displej
#define DISPLAY_WIDTH   128
#define DISPLAY_HEIGHT  32
#define I2C_ADDRESS     0x3C
#define I2C_PORT        i2c1        // GPIO10/11 patří k I2C1
#define I2C_FREQ        400000      // 400 kHz (SSD1306 to má v katalogu jako maximum)
#define SDA_PIN         10
#define SCL_PIN         11

// Displej po připojení napájení potřebuje čas, než začne přijímat příkazy
// (náběh napájení a vnitřní reset). Bez této pauzy se někdy nerozsvítí.
#ifndef DISPLAY_POWERUP_DELAY_MS
#define DISPLAY_POWERUP_DELAY_MS 200
#endif
// Pokud displej při inicializaci přesto neodpoví, zkusíme to znovu.
#ifndef DISPLAY_INIT_RETRIES
#define DISPLAY_INIT_RETRIES 5
#endif
#define DISPLAY_RETRY_DELAY_MS   200

// ------------------------------------------------------------- klávesnice
#define KEY_ROW_BASE    2           // řádky GPIO2..GPIO5 (výstupy)
#define KEY_COL_BASE    6           // sloupce GPIO6..GPIO9 (vstupy s pull-down)
#define KEY_ROWS        4
#define KEY_COLS        4
#define KEY_NONE        0

static const char keymap[KEY_ROWS][KEY_COLS] = {
    {'1', '2', '3', 'A'},
    {'4', '5', '6', 'B'},
    {'7', '8', '9', 'C'},
    {'*', '0', '#', 'D'},
};

// ------------------------------------------------------------- generátor
#define PWM_PIN         20
#define LED_PIN         PICO_DEFAULT_LED_PIN   // GPIO25
#define FREQ_MIN        8           // nižší kmitočet 16bitové PWM při 125 MHz neumí
#define FREQ_MAX        4000000
#define FREQ_DIGITS     7
#define DUTY_MAX        100
#define DUTY_DIGITS     3
#define LOOP_MS         10          // perioda hlavní smyčky (skenování klávesnice)

static ssd1306_t disp;
static bool display_ok = false;

typedef struct {
    char buf[FREQ_DIGITS + 1];      // právě zadávané číslo (text)
    int max_digits;
    uint32_t max_value;
} number_input_t;

static number_input_t freq_in = {"", FREQ_DIGITS, FREQ_MAX};
static number_input_t duty_in = {"", DUTY_DIGITS, DUTY_MAX};
static number_input_t *active = &freq_in;   // co se právě zadává (A / B)
static bool running = false;                // C = běží, D = stojí

// ================================================================ klávesnice
static void keypad_init(void)
{
    for (int r = 0; r < KEY_ROWS; r++) {
        // Řádky necháváme ve vysoké impedanci, aktivní je vždy jen jeden.
        // Při stisku více kláves tak nevznikne zkrat mezi výstupy.
        gpio_init(KEY_ROW_BASE + r);
        gpio_set_dir(KEY_ROW_BASE + r, GPIO_IN);
        gpio_disable_pulls(KEY_ROW_BASE + r);
        gpio_put(KEY_ROW_BASE + r, 0);
    }
    for (int c = 0; c < KEY_COLS; c++) {
        gpio_init(KEY_COL_BASE + c);
        gpio_set_dir(KEY_COL_BASE + c, GPIO_IN);
        gpio_pull_down(KEY_COL_BASE + c);
    }
}

// Vrátí znak stisknuté klávesy nebo KEY_NONE.
static char keypad_scan(void)
{
    char key = KEY_NONE;
    for (int r = 0; r < KEY_ROWS && key == KEY_NONE; r++) {
        uint pin = KEY_ROW_BASE + r;
        gpio_put(pin, 1);
        gpio_set_dir(pin, GPIO_OUT);
        sleep_us(10);                                   // ustálení úrovně
        uint32_t cols = (gpio_get_all() >> KEY_COL_BASE) & 0xF;
        gpio_set_dir(pin, GPIO_IN);
        gpio_put(pin, 0);
        for (int c = 0; c < KEY_COLS; c++) {
            if (cols & (1u << c)) {
                key = keymap[r][c];
                break;
            }
        }
    }
    // Vybití sloupců přes pull-down, ať další sken nečte zbytkový náboj.
    sleep_us(10);
    return key;
}

// Ošetření zákmitů: klávesa platí, až když ji dva skeny po sobě čtou stejně.
// Vrací klávesu jen jednou - v okamžiku stisku.
static char keypad_get_press(void)
{
    static char last_raw = KEY_NONE;
    static char stable = KEY_NONE;
    char raw = keypad_scan();
    char pressed = KEY_NONE;
    if (raw == last_raw && raw != stable) {
        stable = raw;
        pressed = raw;
    }
    last_raw = raw;
    return pressed;
}

// ================================================================== displej
static bool display_init(void)
{
    i2c_init(I2C_PORT, I2C_FREQ);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    // pauza je nutná kvůli displeji, jinak se někdy nerozsvítí
    sleep_ms(DISPLAY_POWERUP_DELAY_MS);

    for (int i = 0; i < DISPLAY_INIT_RETRIES; i++) {
        if (ssd1306_init(&disp, I2C_PORT, I2C_ADDRESS, DISPLAY_WIDTH, DISPLAY_HEIGHT)) {
            ssd1306_clear(&disp);
            if (ssd1306_show(&disp))
                return true;
        }
        printf("Displej neodpovida, pokus %d/%d\n", i + 1, DISPLAY_INIT_RETRIES);
        sleep_ms(DISPLAY_RETRY_DELAY_MS);
    }
    return false;
}

static uint32_t input_value(const number_input_t *in)
{
    return (uint32_t)strtoul(in->buf, NULL, 10);
}

// ================================================================== PWM
typedef struct {
    uint slice, chan;
    bool active;            // výstup opravdu generuje
    uint32_t freq, duty;    // naposledy nastavené hodnoty
    uint32_t real_freq;     // skutečný kmitočet (zaokrouhlení děličky)
} pwm_state_t;

static pwm_state_t gen;

// Nastaví kmitočet a střídu. Vrací false, když kmitočet nejde vyrobit.
static bool pwm_set_freq_duty(uint32_t f, uint32_t duty)
{
    if (f < FREQ_MIN || f > FREQ_MAX)
        return false;
    uint64_t clk16 = (uint64_t)clock_get_hz(clk_sys) * 16;
    // Nejmenší dělička (v 1/16) taková, aby se perioda vešla do 16 bitů.
    // Malá dělička = co největší TOP = nejjemnější krok střídy.
    uint64_t div16 = (clk16 + (uint64_t)f * 65536 - 1) / ((uint64_t)f * 65536);
    if (div16 < 16)
        div16 = 16;
    if (div16 > 255 * 16 + 15)
        return false;
    uint32_t counts = (uint32_t)((clk16 + div16 * f / 2) / (div16 * f));  // zaokrouhleno
    if (counts < 2)
        counts = 2;
    if (counts > 65536)
        counts = 65536;
    uint32_t top = counts - 1;
    uint32_t level = (uint32_t)(((uint64_t)counts * duty + 50) / 100);    // 100 % = trvale 1

    pwm_set_clkdiv_int_frac(gen.slice, (uint8_t)(div16 >> 4), (uint8_t)(div16 & 0xF));
    pwm_set_wrap(gen.slice, (uint16_t)top);
    pwm_set_chan_level(gen.slice, gen.chan, (uint16_t)level);
    gen.real_freq = (uint32_t)((clk16 + div16 * counts / 2) / (div16 * counts));
    return true;
}

static void pwm_init_output(void)
{
    gpio_set_function(PWM_PIN, GPIO_FUNC_PWM);
    gen.slice = pwm_gpio_to_slice_num(PWM_PIN);
    gen.chan = pwm_gpio_to_channel(PWM_PIN);
    pwm_config cfg = pwm_get_default_config();
    pwm_init(gen.slice, &cfg, false);
    // Zastavený generátor drží výstup v nule (samotné vypnutí PWM by nechalo
    // výstup v té úrovni, ve které se zrovna zastavil).
    gpio_set_outover(PWM_PIN, GPIO_OVERRIDE_LOW);
    gen.active = false;
}

// Promítne stav (běží/stojí, kmitočet, střída) do hardwaru, jen když se změnil.
static void pwm_update(void)
{
    uint32_t f = input_value(&freq_in);
    uint32_t d = input_value(&duty_in);
    bool want = running && f >= FREQ_MIN && f <= FREQ_MAX;

    if (want && (!gen.active || f != gen.freq || d != gen.duty)) {
        pwm_set_freq_duty(f, d);
        if (!gen.active) {
            pwm_set_counter(gen.slice, 0);
            pwm_set_enabled(gen.slice, true);
            gpio_set_outover(PWM_PIN, GPIO_OVERRIDE_NORMAL);
        }
        gen.freq = f;
        gen.duty = d;
        gen.active = true;
        printf("PWM: f=%lu Hz (skutecne %lu Hz), strida=%lu %%\n",
               (unsigned long)f, (unsigned long)gen.real_freq, (unsigned long)d);
    } else if (!want && gen.active) {
        gpio_set_outover(PWM_PIN, GPIO_OVERRIDE_LOW);
        pwm_set_enabled(gen.slice, false);
        gen.active = false;
        printf("PWM: zastaveno\n");
    }
    gpio_put(LED_PIN, gen.active);
}

// ================================================================ vstup
static void input_digit(number_input_t *in, char digit)
{
    size_t len = strlen(in->buf);
    if (len == 1 && in->buf[0] == '0')
        len = 0;                                // úvodní nulu přepíšeme
    if ((int)len >= in->max_digits)
        return;
    in->buf[len] = digit;
    in->buf[len + 1] = '\0';
    if (input_value(in) > in->max_value)        // větší než maximum -> maximum
        snprintf(in->buf, sizeof(in->buf), "%lu", (unsigned long)in->max_value);
}

static void handle_key(char key)
{
    switch (key) {
    case 'A': active = &freq_in; break;
    case 'B': active = &duty_in; break;
    case 'C': running = true; break;
    case 'D': running = false; break;
    case '#': active->buf[0] = '\0'; break;
    case '*': {
        size_t len = strlen(active->buf);
        if (len > 0)
            active->buf[len - 1] = '\0';
        break;
    }
    default:
        if (key >= '0' && key <= '9')
            input_digit(active, key);
        break;
    }
}

// ================================================================ zobrazení
static void display_draw(void)
{
    char line[24];
    const char *state = !running ? "OFF" : (gen.active ? "ON" : "---");

    ssd1306_clear(&disp);
    snprintf(line, sizeof(line), "%cHz:%lu", active == &freq_in ? '>' : ' ',
             (unsigned long)input_value(&freq_in));
    ssd1306_draw_string(&disp, 0, 0, line);
    ssd1306_draw_string(&disp, DISPLAY_WIDTH - 8 * (int)strlen(state), 0, state);
    snprintf(line, sizeof(line), "%c %%:%lu", active == &duty_in ? '>' : ' ',
             (unsigned long)input_value(&duty_in));
    ssd1306_draw_string(&disp, 0, 16, line);
    if (running && !gen.active)
        ssd1306_draw_string(&disp, DISPLAY_WIDTH - 8 * 5, 16, "min 8");

    if (!ssd1306_show(&disp))
        display_ok = false;     // displej přestal odpovídat -> znovu inicializovat
}

int main(void)
{
    stdio_init_all();

    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_put(LED_PIN, 0);

    keypad_init();
    pwm_init_output();

    display_ok = display_init();
    if (display_ok) {
        ssd1306_draw_string(&disp, 0, 0, "PWM generator");
        ssd1306_draw_string(&disp, 0, 16, "A:Hz B:% C/D");
        ssd1306_show(&disp);
        sleep_ms(1000);
    }
    printf("Generator obdelnikoveho signalu (PWM na GPIO%d)\n", PWM_PIN);

    bool redraw = true;
    absolute_time_t next_display_retry = get_absolute_time();

    while (true) {
        char key = keypad_get_press();
        if (key != KEY_NONE) {
            printf("Klavesa %c\n", key);
            handle_key(key);
            redraw = true;
        }

        bool was_active = gen.active;
        pwm_update();
        if (gen.active != was_active)
            redraw = true;

        if (!display_ok && time_reached(next_display_retry)) {
            display_ok = ssd1306_init(&disp, I2C_PORT, I2C_ADDRESS, DISPLAY_WIDTH, DISPLAY_HEIGHT);
            next_display_retry = make_timeout_time_ms(1000);
            redraw = display_ok;
        }
        if (redraw && display_ok) {
            display_draw();
            redraw = false;
        }
        sleep_ms(LOOP_MS);
    }
}
