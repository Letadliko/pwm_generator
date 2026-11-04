/* ssd1306.h - jednoduchý ovladač OLED displeje SSD1306 po I2C (Pico SDK)
 *
 * Framebuffer v RAM, kreslení do něj a odeslání celé obrazovky funkcí ssd1306_show().
 */
#ifndef SSD1306_H
#define SSD1306_H

#include <stdbool.h>
#include <stdint.h>
#include "hardware/i2c.h"

#define SSD1306_MAX_W 128
#define SSD1306_MAX_H 64

typedef struct {
    i2c_inst_t *i2c;
    uint8_t addr;
    uint8_t width;
    uint8_t height;
    uint8_t pages;                                     // height / 8
    uint8_t buf[SSD1306_MAX_W * SSD1306_MAX_H / 8];    // framebuffer
} ssd1306_t;

// Inicializace displeje. Vrací false, pokud displej neodpověděl (NACK / timeout).
bool ssd1306_init(ssd1306_t *d, i2c_inst_t *i2c, uint8_t addr, uint8_t width, uint8_t height);
bool ssd1306_contrast(ssd1306_t *d, uint8_t value);
void ssd1306_clear(ssd1306_t *d);
void ssd1306_draw_pixel(ssd1306_t *d, int x, int y, bool on);
void ssd1306_draw_char(ssd1306_t *d, int x, int y, char c);
void ssd1306_draw_string(ssd1306_t *d, int x, int y, const char *s);
// Odešle framebuffer na displej. Vrací false při chybě komunikace.
bool ssd1306_show(ssd1306_t *d);

#endif
