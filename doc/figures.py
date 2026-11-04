# Nakreslí průběhy PWM z výsledků emulace (sim/vystup/mereni.json) do obrazky/prubehy_pwm.png
# Potřebuje matplotlib.
import json
import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(HERE, '..', 'sim', 'vystup', 'mereni.json'), encoding='utf-8'))

grafy = [
    ('pwm_1kHz_50', '1 kHz, střída 50 %', 1e6, 'ms'),
    ('pwm_25kHz_25', '25 kHz, střída 25 %', 1e3, 'µs'),
    ('pwm_50Hz_10', '50 Hz, střída 10 %', 1e6, 'ms'),
    ('pwm_4MHz_50', '4 MHz (skutečně 4,032 MHz), střída 50 %', 1e3, 'µs'),
]

fig, axs = plt.subplots(2, 2, figsize=(8, 4.5))
for ax, (klic, nazev, jednotka, jm) in zip(axs.flat, grafy):
    hrany = data['captures'][klic]['edges']
    nabezne = [h['t'] for h in hrany if h['h']]
    perioda = (nabezne[-1] - nabezne[0]) / (len(nabezne) - 1)
    t0 = nabezne[0] - perioda / 4
    t1 = t0 + 3.5 * perioda

    # schodovitý průběh od t0 do t1
    uroven = 0
    for h in hrany:
        if h['t'] <= t0:
            uroven = 1 if h['h'] else 0
    xs, ys = [t0], [uroven]
    for h in hrany:
        if t0 < h['t'] <= t1:
            xs += [h['t'], h['t']]
            ys += [uroven, 1 if h['h'] else 0]
            uroven = ys[-1]
    xs.append(t1)
    ys.append(uroven)

    ax.plot([(x - t0) / jednotka for x in xs], [y * 3.3 for y in ys], color='tab:blue')
    ax.set_title(nazev, fontsize=10)
    ax.set_xlabel('t [%s]' % jm)
    ax.set_ylabel('U [V]')
    ax.set_ylim(-0.3, 3.8)
    ax.grid(True, alpha=0.4)

fig.tight_layout()
fig.savefig(os.path.join(HERE, 'obrazky', 'prubehy_pwm.png'), dpi=200)
print('uloženo obrazky/prubehy_pwm.png')
