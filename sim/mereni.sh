#!/bin/sh
# Přeloží firmware (normální + kontrolní varianta bez pauzy) a spustí všechny emulace.
# Výsledky: sim/vystup/  (vysledek.md, mereni.json, start_*.json, obrázky displeje)
# Potřeba: PICO_SDK_PATH, arm-none-eabi-gcc, cmake, Node.js 18+
set -e
cd "$(dirname "$0")"
ROOT=..
: "${PICO_SDK_PATH:?nastavte PICO_SDK_PATH}"

cmake -S $ROOT -B $ROOT/build -DPICO_BOARD=pico >/dev/null
cmake --build $ROOT/build -j4 >/dev/null
cmake -S $ROOT -B $ROOT/build_bez_pauzy -DPICO_BOARD=pico \
      -DDISPLAY_POWERUP_DELAY_MS=0 -DDISPLAY_INIT_RETRIES=1 >/dev/null
cmake --build $ROOT/build_bez_pauzy -j4 >/dev/null

[ -d node_modules ] || npm install
rm -rf vystup
npx tsx sim.ts $ROOT/build/pwm_generator.uf2 --out vystup
rm -f vystup/start.json
for v in "normal build 150" "bez_pauzy build_bez_pauzy 150" "pomaly_displej build 250"; do
    set -- $v
    npx tsx sim.ts $ROOT/$2/pwm_generator.uf2 --out vystup/tmp --boot-only --display-ready-ms $3 >/dev/null || true
    mv vystup/tmp/start.json vystup/start_$1.json
    rm -rf vystup/tmp
done
echo "hotovo: sim/vystup/"
