# Výsledek emulace

Firmware: pwm_generator.uf2  
Model displeje: odpovídá až 150 ms po zapnutí  
Emulovaný čas: 40.53 s

| # | Test | Výsledek | Naměřeno / zjištěno |
|---|---|---|---|
| 1 | Během prvních 200 ms po startu firmware na displej nesahá | OK | žádný I2C přenos |
| 2 | První příkaz pro displej přijde až po pauze 200 ms | OK | první přenos v 200.4 ms, odmítnutých přenosů: 0 |
| 3 | Displej se inicializuje a ukáže úvodní obrazovku | OK | displej zapnut, nábojová pumpa zapnuta, 32 řádků; displej „PWM generator“ / „A:Hz B:% C/D“ |
| 4 | Po startu: 0 Hz, 0 %, zastaveno, výstup v 0 | OK | displej „>Hz:0 OFF“ / „%:0“, GPIO20 = 0, LED nesvítí |
| 5 | Displej je na I2C1, I2C0 se nepoužívá | OK | přenosů na I2C0: 0 |
| 6 | Bez stisku C se negeneruje (A1000 B50) | OK | výstup trvale 0, displej „Hz:1000 OFF“ / „> %:50“ |
| 7 | Spuštění: 1000 Hz, 50 % (C) | OK | naměřeno 1000.002 Hz, střída 50.00 %, displej „Hz:1000 ON“ / „> %:50“ |
| 8 | LED svítí, když generátor běží | OK | LED svítí |
| 9 | Změna za běhu: 25 kHz, 25 % (A#25000 B#25) | OK | naměřeno 25000.0 Hz, střída 25.00 % |
| 10 | 50 Hz, 10 % (A#50 B#10) | OK | naměřeno 50.000 Hz, střída 10.00 % |
| 11 | Klávesa * maže poslední číslici (A#1234*5 B#75) | OK | naměřeno 1235.01 Hz, střída 75.00 %, displej „Hz:1235 ON“ / „> %:75“ |
| 12 | Střída 0 %: výstup trvale 0 | OK | trvale 0 |
| 13 | Střída 100 %: výstup trvale 1, bez zákmitu do 0 | OK | trvale 1 |
| 14 | Střída nad 100 % se omezí na 100 (B#150) | OK | displej „Hz:1235 ON“ / „> %:100“, výstup trvale 1 |
| 15 | Kmitočet nad 4 MHz se omezí na 4 000 000 (A#9999999) | OK | displej „>Hz:4000000 ON“ / „%:50“, naměřeno 4.0323 MHz (125 MHz / 31), střída 51.6 % |
| 16 | Kmitočet pod 8 Hz se negeneruje (A#5) | OK | výstup trvale 0, displej „>Hz:5 ---“ / „%:50 min 8“ |
| 17 | Oprava hodnoty za běhu (#2000) | OK | naměřeno 2000.00 Hz |
| 18 | Zastavení (D): výstup 0, LED zhasne | OK | výstup trvale 0, LED nesvítí, displej „>Hz:2000 OFF“ / „%:50“ |

## Výpis firmwaru (USB serial)
```
[  1207.5 ms] Generator obdelnikoveho signalu (PWM na GPIO20)
[  1818.5 ms] Klavesa A
[  1933.1 ms] Klavesa 1
[  2058.0 ms] Klavesa 0
[  2173.1 ms] Klavesa 0
[  2298.5 ms] Klavesa 0
[  2413.8 ms] Klavesa B
[  2539.0 ms] Klavesa 5
[  2654.3 ms] Klavesa 0
[  2800.1 ms] Klavesa C
[  2800.3 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=50 %
[  2945.9 ms] Klavesa A
[  3061.0 ms] Klavesa #
[  3061.1 ms] PWM: zastaveno
[  3186.9 ms] Klavesa 2
[  3302.3 ms] Klavesa 5
[  3302.6 ms] PWM: f=25 Hz (skutecne 25 Hz), strida=50 %
[  3427.6 ms] Klavesa 0
[  3427.9 ms] PWM: f=250 Hz (skutecne 250 Hz), strida=50 %
[  3543.1 ms] Klavesa 0
[  3543.4 ms] PWM: f=2500 Hz (skutecne 2500 Hz), strida=50 %
[  3668.9 ms] Klavesa 0
[  3669.1 ms] PWM: f=25000 Hz (skutecne 25000 Hz), strida=50 %
[  3784.6 ms] Klavesa B
[  3910.0 ms] Klavesa #
[  3910.3 ms] PWM: f=25000 Hz (skutecne 25000 Hz), strida=0 %
[  4025.5 ms] Klavesa 2
[  4025.7 ms] PWM: f=25000 Hz (skutecne 25000 Hz), strida=2 %
[  4140.7 ms] Klavesa 5
[  4141.0 ms] PWM: f=25000 Hz (skutecne 25000 Hz), strida=25 %
[  4266.3 ms] Klavesa A
[  4391.6 ms] Klavesa #
[  4391.7 ms] PWM: zastaveno
[  4507.4 ms] Klavesa 5
[  4633.1 ms] Klavesa 0
[  4633.3 ms] PWM: f=50 Hz (skutecne 50 Hz), strida=25 %
[  4748.4 ms] Klavesa B
[  4873.5 ms] Klavesa #
[  4873.7 ms] PWM: f=50 Hz (skutecne 50 Hz), strida=0 %
[  4988.6 ms] Klavesa 1
[  4988.8 ms] PWM: f=50 Hz (skutecne 50 Hz), strida=1 %
[  5113.6 ms] Klavesa 0
[  5113.9 ms] PWM: f=50 Hz (skutecne 50 Hz), strida=10 %
[  5431.3 ms] Klavesa A
[  5546.2 ms] Klavesa #
[  5546.3 ms] PWM: zastaveno
[  5672.1 ms] Klavesa 1
[  5787.5 ms] Klavesa 2
[  5787.7 ms] PWM: f=12 Hz (skutecne 12 Hz), strida=10 %
[  5912.6 ms] Klavesa 3
[  5912.8 ms] PWM: f=123 Hz (skutecne 123 Hz), strida=10 %
[  6027.8 ms] Klavesa 4
[  6028.0 ms] PWM: f=1234 Hz (skutecne 1234 Hz), strida=10 %
[  6153.3 ms] Klavesa *
[  6153.6 ms] PWM: f=123 Hz (skutecne 123 Hz), strida=10 %
[  6268.7 ms] Klavesa 5
[  6269.0 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=10 %
[  6394.2 ms] Klavesa B
[  6509.5 ms] Klavesa #
[  6509.7 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=0 %
[  6635.0 ms] Klavesa 7
[  6635.3 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=7 %
[  6750.4 ms] Klavesa 5
[  6750.6 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=75 %
[  6896.1 ms] Klavesa B
[  7021.4 ms] Klavesa #
[  7021.7 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=0 %
[  7136.9 ms] Klavesa 0
[  7272.3 ms] Klavesa B
[  7387.5 ms] Klavesa #
[  7512.7 ms] Klavesa 1
[  7513.0 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=1 %
[  7628.0 ms] Klavesa 0
[  7628.3 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=10 %
[  7753.8 ms] Klavesa 0
[  7754.0 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=100 %
[  7879.6 ms] Klavesa B
[  8005.0 ms] Klavesa #
[  8005.3 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=0 %
[  8120.4 ms] Klavesa 1
[  8120.6 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=1 %
[  8235.5 ms] Klavesa 5
[  8235.8 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=15 %
[  8361.1 ms] Klavesa 0
[  8361.4 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=100 %
[  8486.9 ms] Klavesa B
[  8612.4 ms] Klavesa #
[  8612.6 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=0 %
[  8727.8 ms] Klavesa 5
[  8728.0 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=5 %
[  8853.2 ms] Klavesa 0
[  8853.5 ms] PWM: f=1235 Hz (skutecne 1235 Hz), strida=50 %
[  8968.7 ms] Klavesa A
[  9093.9 ms] Klavesa #
[  9094.1 ms] PWM: zastaveno
[  9209.8 ms] Klavesa 9
[  9210.0 ms] PWM: f=9 Hz (skutecne 9 Hz), strida=50 %
[  9335.0 ms] Klavesa 9
[  9335.2 ms] PWM: f=99 Hz (skutecne 99 Hz), strida=50 %
[  9450.2 ms] Klavesa 9
[  9450.5 ms] PWM: f=999 Hz (skutecne 999 Hz), strida=50 %
[  9565.6 ms] Klavesa 9
[  9565.9 ms] PWM: f=9999 Hz (skutecne 9999 Hz), strida=50 %
[  9691.2 ms] Klavesa 9
[  9691.5 ms] PWM: f=99999 Hz (skutecne 100000 Hz), strida=50 %
[  9806.9 ms] Klavesa 9
[  9807.2 ms] PWM: f=999999 Hz (skutecne 1000000 Hz), strida=50 %
[  9932.8 ms] Klavesa 9
[  9933.1 ms] PWM: f=4000000 Hz (skutecne 4032258 Hz), strida=50 %
[ 10048.6 ms] Klavesa A
[ 10174.2 ms] Klavesa #
[ 10174.3 ms] PWM: zastaveno
[ 10290.0 ms] Klavesa 5
[ 10709.2 ms] Klavesa #
[ 10834.9 ms] Klavesa 2
[ 10950.4 ms] Klavesa 0
[ 10950.7 ms] PWM: f=20 Hz (skutecne 20 Hz), strida=50 %
[ 11065.8 ms] Klavesa 0
[ 11066.1 ms] PWM: f=200 Hz (skutecne 200 Hz), strida=50 %
[ 11191.5 ms] Klavesa 0
[ 11191.7 ms] PWM: f=2000 Hz (skutecne 2000 Hz), strida=50 %
[ 11307.0 ms] Klavesa C
[ 11442.6 ms] Klavesa D
[ 11442.7 ms] PWM: zastaveno
[ 11578.3 ms] Klavesa B
[ 11703.8 ms] Klavesa #
[ 11819.1 ms] Klavesa 5
[ 11944.4 ms] Klavesa 0
[ 12059.7 ms] Klavesa A
[ 12185.1 ms] Klavesa #
[ 12300.1 ms] Klavesa 1
[ 12425.0 ms] Klavesa 0
[ 12540.3 ms] Klavesa 0
[ 12655.7 ms] Klavesa 0
[ 12781.3 ms] Klavesa C
[ 12781.5 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=50 %
[ 12896.8 ms] Klavesa #
[ 12896.9 ms] PWM: zastaveno
[ 13022.8 ms] Klavesa 8
[ 13023.0 ms] PWM: f=8 Hz (skutecne 8 Hz), strida=50 %
[ 15891.0 ms] Klavesa #
[ 15891.1 ms] PWM: zastaveno
[ 16006.7 ms] Klavesa 1
[ 16132.3 ms] Klavesa 0
[ 16132.5 ms] PWM: f=10 Hz (skutecne 10 Hz), strida=50 %
[ 18454.2 ms] Klavesa #
[ 18454.3 ms] PWM: zastaveno
[ 18569.9 ms] Klavesa 5
[ 18685.5 ms] Klavesa 0
[ 18685.8 ms] PWM: f=50 Hz (skutecne 50 Hz), strida=50 %
[ 19246.2 ms] Klavesa #
[ 19246.3 ms] PWM: zastaveno
[ 19372.1 ms] Klavesa 1
[ 19487.6 ms] Klavesa 0
[ 19487.9 ms] PWM: f=10 Hz (skutecne 10 Hz), strida=50 %
[ 19613.1 ms] Klavesa 0
[ 19613.4 ms] PWM: f=100 Hz (skutecne 100 Hz), strida=50 %
[ 19951.3 ms] Klavesa #
[ 19951.4 ms] PWM: zastaveno
[ 20067.1 ms] Klavesa 5
[ 20192.8 ms] Klavesa 0
[ 20193.0 ms] PWM: f=50 Hz (skutecne 50 Hz), strida=50 %
[ 20308.2 ms] Klavesa 0
[ 20308.4 ms] PWM: f=500 Hz (skutecne 500 Hz), strida=50 %
[ 20474.3 ms] Klavesa #
[ 20474.4 ms] PWM: zastaveno
[ 20590.0 ms] Klavesa 1
[ 20715.6 ms] Klavesa 0
[ 20715.8 ms] PWM: f=10 Hz (skutecne 10 Hz), strida=50 %
[ 20831.0 ms] Klavesa 0
[ 20831.2 ms] PWM: f=100 Hz (skutecne 100 Hz), strida=50 %
[ 20956.6 ms] Klavesa 0
[ 20956.9 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=50 %
[ 21092.5 ms] Klavesa #
[ 21092.6 ms] PWM: zastaveno
[ 21218.3 ms] Klavesa 1
[ 21333.8 ms] Klavesa 9
[ 21334.1 ms] PWM: f=19 Hz (skutecne 19 Hz), strida=50 %
[ 21459.2 ms] Klavesa 0
[ 21459.5 ms] PWM: f=190 Hz (skutecne 190 Hz), strida=50 %
[ 21574.7 ms] Klavesa 7
[ 21575.0 ms] PWM: f=1907 Hz (skutecne 1907 Hz), strida=50 %
[ 21710.5 ms] Klavesa #
[ 21710.6 ms] PWM: zastaveno
[ 21826.2 ms] Klavesa 1
[ 21951.8 ms] Klavesa 9
[ 21952.0 ms] PWM: f=19 Hz (skutecne 19 Hz), strida=50 %
[ 22067.0 ms] Klavesa 0
[ 22067.3 ms] PWM: f=190 Hz (skutecne 190 Hz), strida=50 %
[ 22192.6 ms] Klavesa 8
[ 22192.9 ms] PWM: f=1908 Hz (skutecne 1908 Hz), strida=50 %
[ 22318.3 ms] Klavesa #
[ 22318.4 ms] PWM: zastaveno
[ 22444.2 ms] Klavesa 5
[ 22559.8 ms] Klavesa 0
[ 22560.1 ms] PWM: f=50 Hz (skutecne 50 Hz), strida=50 %
[ 22675.2 ms] Klavesa 0
[ 22675.4 ms] PWM: f=500 Hz (skutecne 500 Hz), strida=50 %
[ 22800.8 ms] Klavesa 0
[ 22801.1 ms] PWM: f=5000 Hz (skutecne 5000 Hz), strida=50 %
[ 22926.6 ms] Klavesa #
[ 22926.7 ms] PWM: zastaveno
[ 23042.3 ms] Klavesa 1
[ 23167.9 ms] Klavesa 0
[ 23168.1 ms] PWM: f=10 Hz (skutecne 10 Hz), strida=50 %
[ 23283.3 ms] Klavesa 0
[ 23283.5 ms] PWM: f=100 Hz (skutecne 100 Hz), strida=50 %
[ 23408.9 ms] Klavesa 0
[ 23409.1 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=50 %
[ 23524.5 ms] Klavesa 0
[ 23524.8 ms] PWM: f=10000 Hz (skutecne 10000 Hz), strida=50 %
[ 23650.4 ms] Klavesa #
[ 23650.5 ms] PWM: zastaveno
[ 23766.1 ms] Klavesa 3
[ 23891.6 ms] Klavesa 3
[ 23891.8 ms] PWM: f=33 Hz (skutecne 33 Hz), strida=50 %
[ 24006.6 ms] Klavesa 3
[ 24006.9 ms] PWM: f=333 Hz (skutecne 333 Hz), strida=50 %
[ 24131.8 ms] Klavesa 3
[ 24132.1 ms] PWM: f=3333 Hz (skutecne 3333 Hz), strida=50 %
[ 24247.1 ms] Klavesa 3
[ 24247.3 ms] PWM: f=33333 Hz (skutecne 33333 Hz), strida=50 %
[ 24372.7 ms] Klavesa #
[ 24372.8 ms] PWM: zastaveno
[ 24488.4 ms] Klavesa 1
[ 24614.0 ms] Klavesa 0
[ 24614.2 ms] PWM: f=10 Hz (skutecne 10 Hz), strida=50 %
[ 24729.4 ms] Klavesa 0
[ 24729.6 ms] PWM: f=100 Hz (skutecne 100 Hz), strida=50 %
[ 24844.9 ms] Klavesa 0
[ 24845.2 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=50 %
[ 24970.7 ms] Klavesa 0
[ 24970.9 ms] PWM: f=10000 Hz (skutecne 10000 Hz), strida=50 %
[ 25086.4 ms] Klavesa 0
[ 25086.7 ms] PWM: f=100000 Hz (skutecne 100000 Hz), strida=50 %
[ 25212.4 ms] Klavesa #
[ 25212.6 ms] PWM: zastaveno
[ 25328.1 ms] Klavesa 3
[ 25453.6 ms] Klavesa 3
[ 25453.8 ms] PWM: f=33 Hz (skutecne 33 Hz), strida=50 %
[ 25568.6 ms] Klavesa 3
[ 25568.9 ms] PWM: f=333 Hz (skutecne 333 Hz), strida=50 %
[ 25693.8 ms] Klavesa 3
[ 25694.1 ms] PWM: f=3333 Hz (skutecne 3333 Hz), strida=50 %
[ 25809.1 ms] Klavesa 3
[ 25809.4 ms] PWM: f=33333 Hz (skutecne 33333 Hz), strida=50 %
[ 25934.6 ms] Klavesa 3
[ 25934.9 ms] PWM: f=333333 Hz (skutecne 333333 Hz), strida=50 %
[ 26050.3 ms] Klavesa #
[ 26050.4 ms] PWM: zastaveno
[ 26176.1 ms] Klavesa 1
[ 26291.7 ms] Klavesa 0
[ 26291.9 ms] PWM: f=10 Hz (skutecne 10 Hz), strida=50 %
[ 26407.0 ms] Klavesa 0
[ 26407.3 ms] PWM: f=100 Hz (skutecne 100 Hz), strida=50 %
[ 26532.7 ms] Klavesa 0
[ 26532.9 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=50 %
[ 26648.3 ms] Klavesa 0
[ 26648.6 ms] PWM: f=10000 Hz (skutecne 10000 Hz), strida=50 %
[ 26774.2 ms] Klavesa 0
[ 26774.5 ms] PWM: f=100000 Hz (skutecne 100000 Hz), strida=50 %
[ 26890.1 ms] Klavesa 0
[ 26890.4 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=50 %
[ 27016.2 ms] Klavesa #
[ 27016.4 ms] PWM: zastaveno
[ 27132.0 ms] Klavesa 2
[ 27247.4 ms] Klavesa 0
[ 27247.7 ms] PWM: f=20 Hz (skutecne 20 Hz), strida=50 %
[ 27373.0 ms] Klavesa 0
[ 27373.2 ms] PWM: f=200 Hz (skutecne 200 Hz), strida=50 %
[ 27488.5 ms] Klavesa 0
[ 27488.7 ms] PWM: f=2000 Hz (skutecne 2000 Hz), strida=50 %
[ 27614.2 ms] Klavesa 0
[ 27614.5 ms] PWM: f=20000 Hz (skutecne 20000 Hz), strida=50 %
[ 27730.0 ms] Klavesa 0
[ 27730.2 ms] PWM: f=200000 Hz (skutecne 200000 Hz), strida=50 %
[ 27856.0 ms] Klavesa 0
[ 27856.3 ms] PWM: f=2000000 Hz (skutecne 1984127 Hz), strida=50 %
[ 27972.0 ms] Klavesa #
[ 27972.1 ms] PWM: zastaveno
[ 28097.9 ms] Klavesa 3
[ 28213.4 ms] Klavesa 0
[ 28213.7 ms] PWM: f=30 Hz (skutecne 30 Hz), strida=50 %
[ 28328.8 ms] Klavesa 0
[ 28329.0 ms] PWM: f=300 Hz (skutecne 300 Hz), strida=50 %
[ 28454.4 ms] Klavesa 0
[ 28454.7 ms] PWM: f=3000 Hz (skutecne 3000 Hz), strida=50 %
[ 28570.0 ms] Klavesa 0
[ 28570.3 ms] PWM: f=30000 Hz (skutecne 29998 Hz), strida=50 %
[ 28695.9 ms] Klavesa 0
[ 28696.2 ms] PWM: f=300000 Hz (skutecne 299760 Hz), strida=50 %
[ 28811.8 ms] Klavesa 0
[ 28812.1 ms] PWM: f=3000000 Hz (skutecne 2976190 Hz), strida=50 %
[ 28938.0 ms] Klavesa #
[ 28938.1 ms] PWM: zastaveno
[ 29053.8 ms] Klavesa 4
[ 29169.3 ms] Klavesa 0
[ 29169.6 ms] PWM: f=40 Hz (skutecne 40 Hz), strida=50 %
[ 29294.9 ms] Klavesa 0
[ 29295.1 ms] PWM: f=400 Hz (skutecne 400 Hz), strida=50 %
[ 29410.3 ms] Klavesa 0
[ 29410.6 ms] PWM: f=4000 Hz (skutecne 4000 Hz), strida=50 %
[ 29536.1 ms] Klavesa 0
[ 29536.3 ms] PWM: f=40000 Hz (skutecne 40000 Hz), strida=50 %
[ 29651.8 ms] Klavesa 0
[ 29652.1 ms] PWM: f=400000 Hz (skutecne 399361 Hz), strida=50 %
[ 29777.9 ms] Klavesa 0
[ 29778.2 ms] PWM: f=4000000 Hz (skutecne 4032258 Hz), strida=50 %
[ 29893.8 ms] Klavesa A
[ 30019.4 ms] Klavesa #
[ 30019.5 ms] PWM: zastaveno
[ 30135.1 ms] Klavesa 1
[ 30250.6 ms] Klavesa 0
[ 30250.8 ms] PWM: f=10 Hz (skutecne 10 Hz), strida=50 %
[ 30376.1 ms] Klavesa 0
[ 30376.3 ms] PWM: f=100 Hz (skutecne 100 Hz), strida=50 %
[ 30491.6 ms] Klavesa 0
[ 30491.8 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=50 %
[ 30617.2 ms] Klavesa B
[ 30732.5 ms] Klavesa #
[ 30732.7 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 30858.1 ms] Klavesa 0
[ 30993.6 ms] Klavesa #
[ 31118.8 ms] Klavesa 1
[ 31119.1 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=1 %
[ 31254.4 ms] Klavesa #
[ 31254.6 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 31379.9 ms] Klavesa 5
[ 31380.2 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=5 %
[ 31515.5 ms] Klavesa #
[ 31515.8 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 31641.0 ms] Klavesa 1
[ 31641.3 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=1 %
[ 31756.3 ms] Klavesa 0
[ 31756.6 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=10 %
[ 31902.3 ms] Klavesa #
[ 31902.6 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 32017.7 ms] Klavesa 2
[ 32018.0 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=2 %
[ 32142.9 ms] Klavesa 5
[ 32143.2 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=25 %
[ 32278.7 ms] Klavesa #
[ 32278.9 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 32404.1 ms] Klavesa 3
[ 32404.4 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=3 %
[ 32519.3 ms] Klavesa 3
[ 32519.5 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=33 %
[ 32665.0 ms] Klavesa #
[ 32665.2 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 32780.4 ms] Klavesa 5
[ 32780.7 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=5 %
[ 32905.8 ms] Klavesa 0
[ 32906.1 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=50 %
[ 33041.7 ms] Klavesa #
[ 33042.0 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 33167.2 ms] Klavesa 6
[ 33167.5 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=6 %
[ 33282.5 ms] Klavesa 6
[ 33282.8 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=66 %
[ 33428.3 ms] Klavesa #
[ 33428.6 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 33543.8 ms] Klavesa 7
[ 33544.1 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=7 %
[ 33659.1 ms] Klavesa 5
[ 33659.4 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=75 %
[ 33805.0 ms] Klavesa #
[ 33805.2 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 33920.4 ms] Klavesa 9
[ 33920.7 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=9 %
[ 34045.9 ms] Klavesa 0
[ 34046.2 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=90 %
[ 34181.8 ms] Klavesa #
[ 34182.0 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 34307.4 ms] Klavesa 9
[ 34307.6 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=9 %
[ 34422.8 ms] Klavesa 9
[ 34423.0 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=99 %
[ 34568.7 ms] Klavesa #
[ 34568.9 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=0 %
[ 34684.0 ms] Klavesa 1
[ 34684.3 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=1 %
[ 34809.4 ms] Klavesa 0
[ 34809.6 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=10 %
[ 34925.0 ms] Klavesa 0
[ 34925.3 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=100 %
[ 35071.0 ms] Klavesa A
[ 35186.3 ms] Klavesa #
[ 35186.4 ms] PWM: zastaveno
[ 35312.2 ms] Klavesa 1
[ 35427.9 ms] Klavesa 0
[ 35428.2 ms] PWM: f=10 Hz (skutecne 10 Hz), strida=100 %
[ 35543.4 ms] Klavesa 0
[ 35543.7 ms] PWM: f=100 Hz (skutecne 100 Hz), strida=100 %
[ 35669.2 ms] Klavesa 0
[ 35669.4 ms] PWM: f=1000 Hz (skutecne 1000 Hz), strida=100 %
[ 35784.9 ms] Klavesa 0
[ 35785.2 ms] PWM: f=10000 Hz (skutecne 10000 Hz), strida=100 %
[ 35910.9 ms] Klavesa 0
[ 35911.2 ms] PWM: f=100000 Hz (skutecne 100000 Hz), strida=100 %
[ 36027.0 ms] Klavesa 0
[ 36027.3 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=100 %
[ 36143.0 ms] Klavesa B
[ 36268.8 ms] Klavesa #
[ 36269.1 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 36384.7 ms] Klavesa 0
[ 36510.5 ms] Klavesa #
[ 36626.0 ms] Klavesa 1
[ 36626.2 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=1 %
[ 36751.7 ms] Klavesa #
[ 36752.0 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 36867.5 ms] Klavesa 5
[ 36867.8 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=5 %
[ 36993.4 ms] Klavesa #
[ 36993.6 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 37109.1 ms] Klavesa 1
[ 37109.4 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=1 %
[ 37234.9 ms] Klavesa 0
[ 37235.1 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=10 %
[ 37350.9 ms] Klavesa #
[ 37351.2 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 37466.6 ms] Klavesa 2
[ 37466.9 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=2 %
[ 37592.3 ms] Klavesa 5
[ 37592.6 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=25 %
[ 37708.2 ms] Klavesa #
[ 37708.5 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 37834.1 ms] Klavesa 3
[ 37834.3 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=3 %
[ 37949.6 ms] Klavesa 3
[ 37949.9 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=33 %
[ 38075.5 ms] Klavesa #
[ 38075.7 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 38191.3 ms] Klavesa 5
[ 38191.5 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=5 %
[ 38317.1 ms] Klavesa 0
[ 38317.4 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=50 %
[ 38433.1 ms] Klavesa #
[ 38433.4 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 38559.0 ms] Klavesa 6
[ 38559.3 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=6 %
[ 38674.7 ms] Klavesa 6
[ 38675.0 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=66 %
[ 38790.6 ms] Klavesa #
[ 38790.9 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 38916.6 ms] Klavesa 7
[ 38916.8 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=7 %
[ 39032.3 ms] Klavesa 5
[ 39032.6 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=75 %
[ 39158.3 ms] Klavesa #
[ 39158.5 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 39274.1 ms] Klavesa 9
[ 39274.4 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=9 %
[ 39400.1 ms] Klavesa 0
[ 39400.3 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=90 %
[ 39516.1 ms] Klavesa #
[ 39516.4 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 39642.1 ms] Klavesa 9
[ 39642.3 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=9 %
[ 39757.8 ms] Klavesa 9
[ 39758.1 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=99 %
[ 39873.8 ms] Klavesa #
[ 39874.0 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=0 %
[ 39999.6 ms] Klavesa 1
[ 39999.9 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=1 %
[ 40115.3 ms] Klavesa 0
[ 40115.6 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=10 %
[ 40241.5 ms] Klavesa 0
[ 40241.8 ms] PWM: f=1000000 Hz (skutecne 1000000 Hz), strida=100 %
[ 40357.7 ms] Klavesa D
[ 40357.8 ms] PWM: zastaveno
[ 40514.2 ms] Klavesa 5
```
