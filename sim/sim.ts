/* sim.ts - emulace firmwaru pwm_generator v emulátoru RP2040 (rp2040js)
 *
 * Spouští skutečný přeložený firmware (.uf2) instrukci po instrukci a k emulovanému
 * RP2040 připojuje modely periferií podle schématu:
 *   - klávesnice 4x4: řádky GPIO2..5, sloupce GPIO6..9
 *   - OLED SSD1306 128x32 na I2C1 (SDA GPIO10, SCL GPIO11), adresa 0x3C
 *   - měření PWM výstupu na GPIO20 a LED na GPIO25
 *
 * Model displeje po zapnutí napájení nějakou dobu neodpovídá (--display-ready-ms,
 * výchozí 150 ms) - napodobuje displeje, které se bez pauzy po startu nerozsvítí.
 *
 * Použití:  npm install && npm run sim -- ../build/pwm_generator.uf2 [--display-ready-ms 150] [--out vystup]
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { GPIOPinState, LogLevel, ConsoleLogger, Simulator, USBCDC } from 'rp2040js';
import { bootromB1 } from './bootrom.js';

// ------------------------------------------------------------------ argumenty
const argv = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : def;
};
const uf2Path = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!uf2Path) {
  console.error('Použití: npm run sim -- cesta/k/pwm_generator.uf2 [--display-ready-ms N] [--out DIR]');
  process.exit(2);
}
const DISPLAY_READY_MS = Number(opt('--display-ready-ms', '150'));
const OUT_DIR = opt('--out', 'vystup');
const ONLY_BOOT = argv.includes('--boot-only');
fs.mkdirSync(OUT_DIR, { recursive: true });

const MS = 1_000_000; // ns
const sim = new Simulator();
const mcu = sim.rp2040;
mcu.logger = new ConsoleLogger(LogLevel.Error);
mcu.loadBootrom(bootromB1);

// ------------------------------------------------------------------ UF2
function loadUF2(file: string) {
  const data = fs.readFileSync(file);
  for (let off = 0; off + 512 <= data.length; off += 512) {
    const b = data.subarray(off, off + 512);
    if (b.readUInt32LE(0) !== 0x0a324655 || b.readUInt32LE(4) !== 0x9e5d5157) continue;
    const addr = b.readUInt32LE(12);
    const size = b.readUInt32LE(16);
    mcu.flash.set(b.subarray(32, 32 + size), addr - 0x10000000);
  }
}
loadUF2(uf2Path);

// ------------------------------------------------------------------ USB serial (printf)
const log: string[] = [];
let logLine = '';
const cdc = new USBCDC(mcu.usbCtrl);
cdc.onSerialData = (buf) => {
  for (const ch of Buffer.from(buf).toString('latin1')) {
    if (ch === '\n') {
      const line = `[${(sim.clock.nanos / MS).toFixed(1).padStart(8)} ms] ${logLine.replace('\r', '')}`;
      log.push(line);
      console.log('  firmware: ' + line);
      logLine = '';
    } else logLine += ch;
  }
};

// ------------------------------------------------------------------ model SSD1306
class SSD1306Model {
  ram = new Uint8Array(128 * 8);
  on = false;
  chargePump = false;
  mux = 63;
  segRemap = false;
  comDec = false;
  addrMode = 2;
  col0 = 0; col1 = 127; page0 = 0; page1 = 7;
  col = 0; page = 0;
  contrast = 0x7f;
  // statistiky
  firstAccessNs: number | null = null;
  firstAckNs: number | null = null;
  nacks = 0;
  frames = 0;
  // záznam I2C transakcí (pro dokumentaci)
  txLog: { t: number; ack: boolean; bytes: number; kind: string }[] = [];
  private cur: { t: number; ack: boolean; bytes: number; kind: string } | null = null;
  // stav přenosu
  private expectCtrl = true;
  private ctrlCo = false;
  private dataMode = false;
  private cmd: number[] = [];
  private acked = false;

  constructor(readonly addr: number, readonly readyNs: number) {}

  connect(address: number): boolean {
    const now = sim.clock.nanos;
    if (this.firstAccessNs === null) this.firstAccessNs = now;
    this.cur = { t: now, ack: false, bytes: 0, kind: '-' };
    if (this.txLog.length < 200) this.txLog.push(this.cur);
    if (address !== this.addr || now < this.readyNs) {
      this.nacks++;
      this.acked = false;
      return false;
    }
    this.cur.ack = true;
    if (this.firstAckNs === null) this.firstAckNs = now;
    this.acked = true;
    this.expectCtrl = true;
    return true;
  }

  stop() {
    if (this.acked && this.dataMode) this.frames++;
    this.acked = false;
    this.cmd = [];
  }

  write(b: number) {
    if (this.cur) {
      this.cur.bytes++;
      if (this.cur.bytes === 1) this.cur.kind = b & 0x40 ? 'data' : 'cmd';
    }
    if (this.expectCtrl) {
      this.ctrlCo = !!(b & 0x80);
      this.dataMode = !!(b & 0x40);
      this.expectCtrl = false;
      return;
    }
    if (this.dataMode) this.data(b);
    else this.command(b);
    if (this.ctrlCo) this.expectCtrl = true;
  }

  private data(b: number) {
    this.ram[this.page * 128 + this.col] = b;
    if (this.col < this.col1) this.col++;
    else {
      this.col = this.col0;
      if (this.addrMode === 0) this.page = this.page < this.page1 ? this.page + 1 : this.page0;
    }
  }

  private static ARGS: Record<number, number> = {
    0x81: 1, 0x8d: 1, 0x20: 1, 0x21: 2, 0x22: 2, 0xa8: 1, 0xd3: 1, 0xd5: 1, 0xd9: 1, 0xda: 1,
    0xdb: 1, 0xa3: 2, 0x26: 6, 0x27: 6, 0x29: 5, 0x2a: 5,
  };

  private command(b: number) {
    this.cmd.push(b);
    const c = this.cmd[0];
    const need = SSD1306Model.ARGS[c] ?? 0;
    if (this.cmd.length < need + 1) return;
    const a = this.cmd.slice(1);
    this.cmd = [];
    if (c === 0xae) this.on = false;
    else if (c === 0xaf) this.on = true;
    else if (c === 0x8d) this.chargePump = !!(a[0] & 0x04);
    else if (c === 0x81) this.contrast = a[0];
    else if (c === 0x20) this.addrMode = a[0] & 3;
    else if (c === 0x21) { this.col0 = a[0] & 127; this.col1 = a[1] & 127; this.col = this.col0; }
    else if (c === 0x22) { this.page0 = a[0] & 7; this.page1 = a[1] & 7; this.page = this.page0; }
    else if (c === 0xa8) this.mux = a[0] & 63;
    else if (c === 0xa0 || c === 0xa1) this.segRemap = c === 0xa1;
    else if (c === 0xc0 || c === 0xc8) this.comDec = c === 0xc8;
    else if (c >= 0xb0 && c <= 0xb7) this.page = c & 7;
    else if (c <= 0x0f) this.col = (this.col & 0xf0) | c;
    else if (c >= 0x10 && c <= 0x1f) this.col = (this.col & 0x0f) | ((c & 0x0f) << 4);
  }

  get lit() {
    return this.on && this.chargePump;
  }

  // pixel tak, jak ho vidí člověk na modulu 128x32
  pixel(x: number, y: number): boolean {
    if (!this.lit) return false;
    const rows = this.mux + 1;
    const cx = this.segRemap ? x : 127 - x;
    const cy = this.comDec ? y : rows - 1 - y;
    return !!(this.ram[(cy >> 3) * 128 + cx] & (1 << (cy & 7)));
  }

  ascii(): string {
    const lines: string[] = [];
    for (let y = 0; y < 32; y += 2) {
      let s = '';
      for (let x = 0; x < 128; x++) {
        const t = this.pixel(x, y), b = this.pixel(x, y + 1);
        s += t && b ? '█' : t ? '▀' : b ? '▄' : ' ';
      }
      lines.push('    │' + s + '│');
    }
    return ['    ┌' + '─'.repeat(128) + '┐', ...lines, '    └' + '─'.repeat(128) + '┘'].join('\n');
  }

  png(file: string) {
    const S = 4, B = 8, W = 128 * S + 2 * B, H = 32 * S + 2 * B;
    const raw = Buffer.alloc((W * 3 + 1) * H);
    for (let y = 0; y < H; y++) {
      raw[y * (W * 3 + 1)] = 0;
      for (let x = 0; x < W; x++) {
        const px = Math.floor((x - B) / S), py = Math.floor((y - B) / S);
        const inside = x >= B && y >= B && px < 128 && py < 32;
        const on = inside && this.pixel(px, py);
        const c = on ? [120, 220, 255] : inside ? [8, 12, 20] : [40, 40, 48];
        raw.set(c, y * (W * 3 + 1) + 1 + x * 3);
      }
    }
    fs.writeFileSync(file, encodePNG(W, H, raw));
  }
}

function encodePNG(w: number, h: number, raw: Buffer) {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const oled = new SSD1306Model(0x3c, DISPLAY_READY_MS * MS);
const i2c = mcu.i2c[1];
let i2cStarts = 0;
i2c.onStart = () => { i2cStarts++; i2c.completeStart(); };
i2c.onConnect = (address) => {
  const ack = oled.connect(address);
  i2c.completeConnect(ack);
  // Na skutečném RP2040 je TX_EMPTY úrovňový příznak (FIFO je po abortu prázdné).
  // rp2040js ho po NACK adresy nenastaví a SDK by zbytečně čekalo na timeout.
  if (!ack) (i2c as any).setInterrupts(1 << 4);
};
i2c.onWriteByte = (v) => { oled.write(v); i2c.completeWrite(true); };
i2c.onReadByte = () => i2c.completeRead(0xff);
i2c.onStop = () => { oled.stop(); i2c.completeStop(); };
// I2C0 nemá nic připojeno -> NACK (kdyby firmware omylem použil špatnou sběrnici)
const i2c0 = mcu.i2c[0];
let i2c0Access = 0;
i2c0.onConnect = () => { i2c0Access++; i2c0.completeConnect(false); };

// ------------------------------------------------------------------ model klávesnice
const ROW_BASE = 2, COL_BASE = 6;
const KEYMAP = ['123A', '456B', '789C', '*0#D'];
const pressed = new Set<string>();
// záznam logických úrovní řádků a sloupců (jako logický analyzátor)
let logic: { pin: string; t: number; v: number }[] | null = null;
const colState = [false, false, false, false];
function updateColumns() {
  for (let c = 0; c < 4; c++) {
    let v = false;
    for (let r = 0; r < 4; r++) {
      if (pressed.has(KEYMAP[r][c]) && mcu.gpio[ROW_BASE + r].value === GPIOPinState.High) v = true;
    }
    if (logic && v !== colState[c]) logic.push({ pin: `COL${c + 1}`, t: sim.clock.nanos, v: v ? 1 : 0 });
    colState[c] = v;
    mcu.gpio[COL_BASE + c].setInputValue(v);
  }
}
for (let r = 0; r < 4; r++) {
  mcu.gpio[ROW_BASE + r].addListener((state) => {
    // 1 = buzeno do 1, 0 = buzeno do 0, 0.5 = vysoká impedance (vstup)
    const v = state === GPIOPinState.High ? 1 : state === GPIOPinState.Low ? 0 : 0.5;
    if (logic) logic.push({ pin: `ROW${r + 1}`, t: sim.clock.nanos, v });
    updateColumns();
  });
}

// ------------------------------------------------------------------ měření PWM (GPIO20) a LED
const PWM_PIN = 20, LED_PIN = 25;
let edges: { t: number; high: boolean }[] = [];
let recording = false;
mcu.gpio[PWM_PIN].addListener((state) => {
  if (recording) edges.push({ t: sim.clock.nanos, high: state === GPIOPinState.High });
});
const pinHigh = (p: number) => mcu.gpio[p].value === GPIOPinState.High;

// ------------------------------------------------------------------ běh emulace
const CYCLE_NS = 1e9 / 125e6;
function runUntil(tNs: number) {
  const { core } = mcu;
  const clock = sim.clock;
  while (clock.nanos < tNs) {
    if (core.waiting) {
      const d = clock.nanosToNextAlarm;
      clock.tick(d > 0 ? Math.min(d, tNs - clock.nanos) : tNs - clock.nanos);
    } else {
      clock.tick(core.executeInstruction() * CYCLE_NS);
    }
  }
}
const now = () => sim.clock.nanos;
const runFor = (ms: number) => runUntil(now() + ms * MS);

function type(keys: string) {
  for (const k of keys) {
    pressed.add(k); updateColumns();
    runFor(60);
    pressed.delete(k); updateColumns();
    runFor(60);
  }
}

const captures: Record<string, { windowNs: number; startHigh: boolean; edges: { t: number; h: boolean }[] }> = {};
function measure(windowMs: number, capture?: string) {
  edges = [];
  recording = true;
  const startHigh = pinHigh(PWM_PIN);
  const t0 = now();
  runFor(windowMs);
  recording = false;
  const t1 = now();
  const rises = edges.filter((e) => e.high).map((e) => e.t);
  let highNs = 0, level = startHigh, last = t0;
  for (const e of edges) {
    if (level) highNs += e.t - last;
    level = e.high; last = e.t;
  }
  if (level) highNs += t1 - last;
  if (capture) {
    captures[capture] = {
      windowNs: t1 - t0, startHigh,
      edges: edges.slice(0, 5000).map((e) => ({ t: e.t - t0, h: e.high })),
    };
  }
  const freq = rises.length >= 2 ? ((rises.length - 1) * 1e9) / (rises[rises.length - 1] - rises[0]) : 0;
  // střída z celých period (od první do poslední náběžné hrany), jinak z celého okna
  let duty = (100 * highNs) / (t1 - t0);
  if (rises.length >= 2) {
    const a = rises[0], z = rises[rises.length - 1];
    let hi = 0, lvl = true, last = a;
    for (const e of edges) {
      if (e.t <= a) continue;
      if (e.t > z) break;
      if (lvl) hi += e.t - last;
      lvl = e.high; last = e.t;
    }
    duty = (100 * hi) / (z - a);
  }
  return { freq, duty, edges: edges.length, constant: edges.length === 0 ? (startHigh ? 'HIGH' : 'LOW') : null };
}


// ------------------------------------------------------------------ čtení textu z displeje
// Firmware píše text fontem 8x16 na pozice dělitelné 8 px, takže obsah displeje jde
// porovnat s fontem po buňkách 8x16 (2 řádky x 16 znaků).
const FONT = new Map<string, string>();
{
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'font8x16.c'), 'utf-8');
  const glyphs = [...src.matchAll(/\{((?:\s*0x[0-9a-fA-F]{2}\s*,?){16})\}/g)];
  glyphs.forEach((g, i) => FONT.set(g[1].replace(/\s/g, '').toLowerCase(), String.fromCharCode(32 + i)));
}
function screenText(): string[] {
  const lines: string[] = [];
  for (let row = 0; row < 2; row++) {
    let line = '';
    for (let col = 0; col < 16; col++) {
      const bytes: string[] = [];
      for (let py = 0; py < 16; py++) {
        let b = 0;
        for (let px = 0; px < 8; px++) if (oled.pixel(col * 8 + px, row * 16 + py)) b |= 0x80 >> px;
        bytes.push('0x' + b.toString(16).padStart(2, '0'));
      }
      line += FONT.get(bytes.join(',')) ?? '?';
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
const show = (scr: string[]) => `displej „${scr[0].trim().replace(/ {2,}/g, ' ')}“ / „${scr[1].trim().replace(/ {2,}/g, ' ')}“`;
const ms = (ns: number) => (ns / MS).toFixed(1);
const lvl = (c: string) => (c === 'HIGH' ? '1' : '0');

// ------------------------------------------------------------------ testy
type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];
function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  OK  ' : '  CHYBA'} ${name}: ${detail}`);
}
let shot = 0;
function screenshot(label: string) {
  const file = path.join(OUT_DIR, `${String(++shot).padStart(2, '0')}_${label}.png`);
  oled.png(file);
  console.log(`\n  displej (${label}) -> ${file}\n${oled.ascii()}\n`);
}
const near = (a: number, b: number, tolPct: number) => Math.abs(a - b) <= (Math.abs(b) * tolPct) / 100;

console.log(`Firmware: ${uf2Path}`);
console.log(`Model displeje: odpovídá až ${DISPLAY_READY_MS} ms po zapnutí napájení\n`);

mcu.core.PC = 0x10000000;

// --- start a inicializace displeje
runUntil(199 * MS);
check('Během prvních 200 ms po startu firmware na displej nesahá',
  oled.firstAccessNs === null,
  oled.firstAccessNs === null ? 'žádný I2C přenos' : `první přenos v ${ms(oled.firstAccessNs)} ms`);
runUntil(600 * MS);
check('První příkaz pro displej přijde až po pauze 200 ms',
  oled.firstAccessNs !== null && oled.firstAccessNs >= 200 * MS,
  `první přenos v ${oled.firstAccessNs === null ? '-' : ms(oled.firstAccessNs)} ms, odmítnutých přenosů: ${oled.nacks}`);
let scr = screenText();
check('Displej se inicializuje a ukáže úvodní obrazovku', oled.lit && scr[0] === 'PWM generator',
  `displej zapnut, nábojová pumpa zapnuta, ${oled.mux + 1} řádků; ${show(scr)}`);
screenshot('uvodni_obrazovka');
runUntil(1800 * MS);
screenshot('hlavni_obrazovka');
scr = screenText();
check('Po startu: 0 Hz, 0 %, zastaveno, výstup v 0',
  scr[0].startsWith('>Hz:0') && scr[0].endsWith('OFF') && scr[1].includes('%:0') && !pinHigh(PWM_PIN) && !pinHigh(LED_PIN),
  `${show(scr)}, GPIO20 = ${pinHigh(PWM_PIN) ? 1 : 0}, LED ${pinHigh(LED_PIN) ? 'svítí' : 'nesvítí'}`);
check('Displej je na I2C1, I2C0 se nepoužívá', i2c0Access === 0, `přenosů na I2C0: ${i2c0Access}`);

fs.writeFileSync(path.join(OUT_DIR, 'start.json'), JSON.stringify({
  displayReadyMs: DISPLAY_READY_MS, firstAccessNs: oled.firstAccessNs, firstAckNs: oled.firstAckNs,
  nacks: oled.nacks, lit: oled.lit, i2c: oled.txLog.slice(0, 8), log,
}, null, 1));

if (!ONLY_BOOT) {
  // --- 1 kHz, 50 %
  type('A1000B50');
  screenshot('zadano_1kHz_50pct_stoji');
  scr = screenText();
  check('Bez stisku C se negeneruje (A1000 B50)', measure(20).constant === 'LOW' && scr[0].endsWith('OFF'),
    `výstup trvale 0, ${show(scr)}`);
  type('C');
  let m = measure(30, 'pwm_1kHz_50');
  screenshot('bezi_1kHz_50pct');
  scr = screenText();
  check('Spuštění: 1000 Hz, 50 % (C)', near(m.freq, 1000, 0.1) && near(m.duty, 50, 1) && scr[0].endsWith('ON'),
    `naměřeno ${m.freq.toFixed(3)} Hz, střída ${m.duty.toFixed(2)} %, ${show(scr)}`);
  check('LED svítí, když generátor běží', pinHigh(LED_PIN), `LED ${pinHigh(LED_PIN) ? 'svítí' : 'nesvítí'}`);

  // --- změna za běhu: 25 kHz, 25 %
  type('A#25000B#25');
  m = measure(5, 'pwm_25kHz_25');
  screenshot('bezi_25kHz_25pct');
  check('Změna za běhu: 25 kHz, 25 % (A#25000 B#25)', near(m.freq, 25000, 0.1) && near(m.duty, 25, 1),
    `naměřeno ${m.freq.toFixed(1)} Hz, střída ${m.duty.toFixed(2)} %`);

  // --- nízký kmitočet: 50 Hz, 10 %
  type('A#50B#10');
  m = measure(200, 'pwm_50Hz_10');
  check('50 Hz, 10 % (A#50 B#10)', near(m.freq, 50, 0.1) && near(m.duty, 10, 1),
    `naměřeno ${m.freq.toFixed(3)} Hz, střída ${m.duty.toFixed(2)} %`);

  // --- oprava číslice hvězdičkou: 1234 -> * -> 5 = 1235 Hz
  type('A#1234*5B#75');
  m = measure(30);
  scr = screenText();
  check('Klávesa * maže poslední číslici (A#1234*5 B#75)',
    near(m.freq, 1235, 0.1) && near(m.duty, 75, 1) && scr[0].includes('Hz:1235'),
    `naměřeno ${m.freq.toFixed(2)} Hz, střída ${m.duty.toFixed(2)} %, ${show(scr)}`);

  // --- krajní střídy
  type('B#0');
  m = measure(10);
  check('Střída 0 %: výstup trvale 0', m.constant === 'LOW', m.constant ? `trvale ${lvl(m.constant)}` : `${m.edges} hran`);
  type('B#100');
  m = measure(10);
  check('Střída 100 %: výstup trvale 1, bez zákmitu do 0', m.constant === 'HIGH',
    m.constant ? `trvale ${lvl(m.constant)}` : `${m.edges} hran`);
  type('B#150');
  screenshot('strida_omezena_na_100');
  m = measure(10);
  scr = screenText();
  check('Střída nad 100 % se omezí na 100 (B#150)', m.constant === 'HIGH' && scr[1].includes('%:100'),
    `${show(scr)}, výstup trvale ${m.constant ? lvl(m.constant) : '?'}`);

  // --- maximum 4 MHz
  type('B#50A#9999999');
  m = measure(0.05, 'pwm_4MHz_50');
  screenshot('kmitocet_omezen_4MHz');
  scr = screenText();
  check('Kmitočet nad 4 MHz se omezí na 4 000 000 (A#9999999)',
    near(m.freq, 125e6 / 31, 0.5) && scr[0].includes('Hz:4000000'),
    `${show(scr)}, naměřeno ${(m.freq / 1e6).toFixed(4)} MHz (125 MHz / 31), střída ${m.duty.toFixed(1)} %`);

  // --- příliš nízký kmitočet
  type('A#5');
  m = measure(300);
  screenshot('kmitocet_pod_minimem');
  scr = screenText();
  check('Kmitočet pod 8 Hz se negeneruje (A#5)',
    m.constant === 'LOW' && scr[0].endsWith('---') && scr[1].endsWith('min 8'),
    `výstup trvale ${m.constant ? lvl(m.constant) : '?'}, ${show(scr)}`);

  // --- zastavení
  type('#2000C');
  m = measure(10);
  check('Oprava hodnoty za běhu (#2000)', near(m.freq, 2000, 0.1), `naměřeno ${m.freq.toFixed(2)} Hz`);
  type('D');
  m = measure(20);
  screenshot('zastaveno');
  scr = screenText();
  check('Zastavení (D): výstup 0, LED zhasne', m.constant === 'LOW' && !pinHigh(LED_PIN) && scr[0].endsWith('OFF'),
    `výstup trvale ${m.constant ? lvl(m.constant) : '?'}, LED ${pinHigh(LED_PIN) ? 'svítí' : 'nesvítí'}, ${show(scr)}`);
  // --- měření pro dokumentaci: rozmítání kmitočtu a střídy
  const sweepF = [8, 10, 50, 100, 500, 1000, 1907, 1908, 5000, 10000, 33333, 100000, 333333, 1000000, 2000000, 3000000, 4000000];
  const freqSweep: { set: number; freq: number; duty: number }[] = [];
  type('B#50A#1000C');
  for (const fset of sweepF) {
    type('#' + fset);
    const periodMs = 1000 / fset;
    runFor(Math.max(2 * periodMs, 1));
    const w = Math.min(Math.max(20 * periodMs, 0.01), 3000);
    const r = measure(w);
    freqSweep.push({ set: fset, freq: r.freq, duty: r.duty });
    console.log(`  rozmítání f: nastaveno ${fset} Hz -> ${r.freq.toFixed(3)} Hz, ${r.duty.toFixed(2)} %`);
  }
  const dutySweep: { f: number; set: number; duty: number; constant: string | null }[] = [];
  for (const fset of [1000, 1000000]) {
    type('A#' + fset + 'B');
    for (const d of [0, 1, 5, 10, 25, 33, 50, 66, 75, 90, 99, 100]) {
      type('#' + d);
      runFor(1);
      const r = measure(Math.max(20000 / fset, 0.01));
      dutySweep.push({ f: fset, set: d, duty: r.duty, constant: r.constant });
      console.log(`  rozmítání střídy @${fset} Hz: ${d} % -> ${r.duty.toFixed(3)} %`);
    }
  }
  type('D');

  // --- logický analyzátor: skenování klávesnice při stisku klávesy 5
  runFor(20);
  logic = [];
  const tl0 = now();
  const initRows = [0, 1, 2, 3].map((r) => mcu.gpio[ROW_BASE + r].value === GPIOPinState.High ? 1 : mcu.gpio[ROW_BASE + r].value === GPIOPinState.Low ? 0 : 0.5);
  runFor(15);
  const tPress = now() - tl0;
  pressed.add('5'); updateColumns();
  runFor(30);
  pressed.delete('5'); updateColumns();
  const tRelease = now() - tl0;
  runFor(5);
  const keypadLogic = { windowNs: now() - tl0, tPress, tRelease, initRows, events: logic.map((e) => ({ ...e, t: e.t - tl0 })) };
  logic = null;

  fs.writeFileSync(path.join(OUT_DIR, 'mereni.json'), JSON.stringify({
    displayReadyMs: DISPLAY_READY_MS,
    i2cStart: oled.txLog.slice(0, 12),
    freqSweep, dutySweep, captures, keypadLogic,
  }, null, 1));

}

console.log(`\nSnímků displeje odesláno: ${oled.frames}, I2C transakcí: ${i2cStarts}, NACK: ${oled.nacks}`);
const failed = results.filter((r) => !r.ok);
const report = [
  `# Výsledek emulace`,
  ``,
  `Firmware: ${path.basename(uf2Path)}  `,
  `Model displeje: odpovídá až ${DISPLAY_READY_MS} ms po zapnutí  `,
  `Emulovaný čas: ${(now() / 1e9).toFixed(2)} s`,
  ``,
  '| # | Test | Výsledek | Naměřeno / zjištěno |',
  '|---|---|---|---|',
  ...results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.ok ? 'OK' : 'CHYBA'} | ${r.detail} |`),
  ``,
  `## Výpis firmwaru (USB serial)`,
  '```',
  ...log,
  '```',
  ``,
].join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'vysledek.md'), report);
console.log(`\n${results.length - failed.length}/${results.length} testů v pořádku`);
process.exit(failed.length ? 1 : 0);
