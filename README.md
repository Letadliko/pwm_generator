# Generátor PWM s Raspberry Pi Pico

Školní projekt: generátor obdélníkového signálu (8 Hz – 4 MHz, střída 0–100 %) ovládaný
klávesnicí 4×4, hodnoty se ukazují na OLED displeji SSD1306. Výstup je na GPIO20.

Dokumentace: [doc/dokumentace.pdf](doc/dokumentace.pdf)

## Zapojení

- klávesnice: řádky GPIO2–GPIO5, sloupce GPIO6–GPIO9
- displej: SDA GPIO10, SCL GPIO11, VCC 3V3, GND
- výstup PWM: GPIO20 (pin 26)

Schéma v KiCadu je ve složce `schema/`.

## Ovládání

A = kmitočet, B = střída, C = start, D = stop, * = smazat číslici, # = smazat číslo

## Sestavení

```
export PICO_SDK_PATH=/cesta/k/pico-sdk
cmake -S . -B build
cmake --build build
```

Hotový soubor je i ve `firmware/pwm_generator.uf2`. Nahraje se tak, že se drží BOOTSEL,
Pico se připojí k USB a soubor se přetáhne na disk RPI-RP2.

## Složky

- `schema/` – schéma v KiCadu
- `firmware/` – přeložený program
- `sim/` – test v emulátoru (`sim/mereni.sh`)
- `doc/` – dokumentace (`dokumentace.pdf`, text je v `dokumentace.html`, PDF se znovu
  vytvoří příkazem `python3 doc/build.py`)

Font displeje (`font8x16.c`) je Spleen, licence BSD (viz `FONT_LICENSE`).
