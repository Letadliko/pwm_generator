/* font8x16.h - bitmapový font 8x16 px (ASCII 32..126) */
#ifndef FONT8X16_INCLUDED
#define FONT8X16_INCLUDED

#include <stdint.h>

#define FONT8X16_FIRST 32
#define FONT8X16_LAST  126
#define FONT8X16_COUNT (FONT8X16_LAST - FONT8X16_FIRST + 1)
#define FONT8X16_W 8
#define FONT8X16_H 16

extern const uint8_t font8x16[FONT8X16_COUNT][16];

#endif
