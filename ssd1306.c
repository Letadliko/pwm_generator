/* ssd1306.c - jednoduchý ovladač OLED displeje SSD1306 po I2C (Pico SDK) */
#include "ssd1306.h"
#include "font8x16.h"
#include <string.h>

#define I2C_TIMEOUT_US 50000   // ochrana proti zaseknutí při odpojeném displeji

// I2C zápis: první bajt je řídicí (0x00 = příkazy, 0x40 = data)
static bool write_raw(ssd1306_t *d, const uint8_t *data, size_t len)
{
    int r = i2c_write_timeout_us(d->i2c, d->addr, data, len, false, I2C_TIMEOUT_US);
    return r == (int)len;
}

static bool write_cmds(ssd1306_t *d, const uint8_t *cmds, size_t n)
{
    uint8_t tx[32];
    if (n + 1 > sizeof(tx))
        return false;
    tx[0] = 0x00;
    memcpy(&tx[1], cmds, n);
    return write_raw(d, tx, n + 1);
}

bool ssd1306_init(ssd1306_t *d, i2c_inst_t *i2c, uint8_t addr, uint8_t width, uint8_t height)
{
    d->i2c = i2c;
    d->addr = addr;
    d->width = width;
    d->height = height;
    d->pages = height / 8;
    memset(d->buf, 0, sizeof(d->buf));

    const uint8_t init[] = {
        0xAE,                              // displej vypnout
        0xD5, 0x80,                        // hodiny / oscilátor
        0xA8, (uint8_t)(height - 1),       // multiplex
        0xD3, 0x00,                        // offset
        0x40,                              // start line 0
        0x8D, 0x14,                        // nábojová pumpa zapnout
        0x20, 0x00,                        // horizontální adresování
        0xA1,                              // zrcadlení segmentů
        0xC8,                              // směr skenování COM
        0xDA, (uint8_t)(height == 32 ? 0x02 : 0x12), // konfigurace COM pinů
        0x81, 0x10,                        // kontrast (nízký, šetří displej)
        0xD9, 0xF1,                        // pre-charge
        0xDB, 0x40,                        // VCOMH
        0xA4,                              // zobrazovat obsah RAM
        0xA6,                              // neinvertovaně
        0x2E,                              // vypnout scroll
        0xAF,                              // displej zapnout
    };
    return write_cmds(d, init, sizeof(init));
}

bool ssd1306_contrast(ssd1306_t *d, uint8_t value)
{
    const uint8_t cmd[] = {0x81, value};
    return write_cmds(d, cmd, sizeof(cmd));
}

void ssd1306_clear(ssd1306_t *d)
{
    memset(d->buf, 0, (size_t)d->width * d->pages);
}

void ssd1306_draw_pixel(ssd1306_t *d, int x, int y, bool on)
{
    if (x < 0 || y < 0 || x >= d->width || y >= d->height)
        return;
    uint8_t *b = &d->buf[(y / 8) * d->width + x];
    if (on)
        *b |= (uint8_t)(1u << (y & 7));
    else
        *b &= (uint8_t)~(1u << (y & 7));
}

void ssd1306_draw_char(ssd1306_t *d, int x, int y, char c)
{
    if (c < FONT8X16_FIRST || c > FONT8X16_LAST)
        c = '?';
    const uint8_t *g = font8x16[c - FONT8X16_FIRST];
    for (int row = 0; row < FONT8X16_H; row++)
        for (int col = 0; col < FONT8X16_W; col++)
            ssd1306_draw_pixel(d, x + col, y + row, g[row] & (0x80 >> col));
}

void ssd1306_draw_string(ssd1306_t *d, int x, int y, const char *s)
{
    for (; *s; s++, x += FONT8X16_W)
        ssd1306_draw_char(d, x, y, *s);
}

bool ssd1306_show(ssd1306_t *d)
{
    static uint8_t tx[1 + sizeof(((ssd1306_t *)0)->buf)];
    const uint8_t window[] = {
        0x21, 0x00, (uint8_t)(d->width - 1),   // sloupce 0..width-1
        0x22, 0x00, (uint8_t)(d->pages - 1),   // stránky 0..pages-1
    };
    if (!write_cmds(d, window, sizeof(window)))
        return false;
    size_t n = (size_t)d->width * d->pages;
    tx[0] = 0x40;
    memcpy(&tx[1], d->buf, n);
    return write_raw(d, tx, n + 1);
}
