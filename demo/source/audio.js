// Procedural soundtrack, 120 BPM, A minor. Writes music.wav (44.1 kHz stereo, 16-bit).
const fs = require("fs");
const TL = require("./timeline.js");
const SR = 44100, DUR = TL.DUR, N = Math.ceil(DUR * SR);
const L = new Float32Array(N), Rr = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N);
let seed = 1234;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const TAU = Math.PI * 2;
const BEAT = 0.5, BAR = 2;

function put(i, v, pan = 0, rev = 0) {
  if (i < 0 || i >= N) return;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  L[i] += v * gl; Rr[i] += v * gr;
  if (rev) { sendL[i] += v * gl * rev; sendR[i] += v * gr * rev; }
}
// generic voice: fn(tLocal) -> sample, env over dur
function voice(t0, dur, fn, { pan = 0, rev = 0, gain = 1 } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  for (let k = 0; k < n; k++) put(i0 + k, gain * fn(k / SR), pan, rev);
}
const envAD = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const envASR = (t, a, dur, r) => (t < a ? t / a : t < dur - r ? 1 : Math.max(0, (dur - t) / r));

// ---------- instruments ----------
function pad(t0, dur, freqs, gain) {
  freqs.forEach((f, j) => {
    const det = [0.997, 1.0, 1.004];
    voice(t0, dur, (t) => {
      let s = 0;
      for (const d of det) for (let h = 1; h <= 6; h++) s += Math.sin(TAU * f * d * h * t + h * j) / (h * h * 0.9 + h * 0.1);
      return s * envASR(t, 0.6, dur, 0.9) * (0.85 + 0.15 * Math.sin(TAU * 0.3 * t + j));
    }, { pan: (j - 1.5) * 0.35, rev: 0.5, gain: gain / freqs.length / 3 });
  });
}
function kalimba(t0, f, gain, pan = 0) {
  voice(t0, 1.4, (t) => (Math.sin(TAU * f * t) + 0.22 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t / 0.05) + 0.12 * Math.sin(TAU * f * 3 * t) * Math.exp(-t / 0.2)) * envAD(t, 0.002, 0.42),
    { pan, rev: 0.45, gain });
}
function kick(t0, gain) {
  let ph = 0;
  voice(t0, 0.5, (t) => { const f = 45 + 110 * Math.exp(-t / 0.035); ph += TAU * f / SR; return Math.sin(ph) * envAD(t, 0.001, 0.16) + 0.25 * Math.sin(ph * 0.5) * envAD(t, 0.001, 0.3); }, { gain });
}
function noiseHit(t0, dur, decay, gain, { pan = 0, rev = 0.1, hp = 0.85, bp = 0 } = {}) {
  let prev = 0, lp = 0;
  voice(t0, dur, (t) => {
    const w = rnd() * 2 - 1;
    let v = w - hp * prev; prev = w; // crude high-pass
    if (bp) { lp += bp * (v - lp); v = lp; }
    return v * envAD(t, 0.0015, decay);
  }, { pan, rev, gain });
}
function clap(t0, gain) { [0, 0.011, 0.022].forEach((d, k) => noiseHit(t0 + d, 0.25, k === 2 ? 0.09 : 0.012, gain, { rev: 0.35, hp: 0.5, bp: 0.35 })); }
function bass(t0, f, dur, gain) {
  voice(t0, dur, (t) => (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t) + 0.1 * Math.sin(TAU * 3 * f * t)) * envASR(t, 0.01, dur, 0.08) * Math.exp(-t / 0.6), { gain });
}
function impact(t0, gain) {
  let ph = 0;
  voice(t0, 2.2, (t) => { const f = 30 + 70 * Math.exp(-t / 0.12); ph += TAU * f / SR; return Math.sin(ph) * envAD(t, 0.002, 0.7); }, { gain, rev: 0.2 });
  noiseHit(t0, 1.6, 0.35, gain * 0.25, { rev: 0.9, hp: 0.3, bp: 0.08 });
}
function riser(t0, t1, gain) {
  let lp = 0, ph = 0;
  voice(t0, t1 - t0, (t) => {
    const k = t / (t1 - t0);
    lp += (0.01 + 0.25 * k * k) * ((rnd() * 2 - 1) - lp);
    ph += TAU * (200 + 900 * k * k) / SR;
    return (lp * 1.4 + 0.08 * Math.sin(ph)) * k * k;
  }, { gain, rev: 0.5 });
}
function whoosh(t0, gain, pan) {
  let lp = 0;
  voice(t0, 0.45, (t) => { const k = t / 0.45; lp += (0.05 + 0.3 * Math.sin(Math.PI * k)) * ((rnd() * 2 - 1) - lp); return lp * Math.sin(Math.PI * k); }, { gain, pan, rev: 0.3 });
}
function pop(t0, gain, f = 900) { voice(t0, 0.12, (t) => Math.sin(TAU * (f + 900 * Math.exp(-t / 0.02)) * t) * envAD(t, 0.001, 0.025), { gain, pan: 0.35, rev: 0.15 }); }
function tap(t0, gain) { noiseHit(t0, 0.05, 0.006, gain, { pan: 0.35, hp: 0.95, rev: 0 }); pop(t0, gain * 0.5, 2200); }
function ding(t0, gain) { [1568, 2093.0].forEach((f, k) => voice(t0 + k * 0.12, 1.4, (t) => (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / 0.1)) * envAD(t, 0.002, 0.35), { gain, pan: 0.35, rev: 0.4 })); }

// ---------- harmony ----------
const CH = [
  { root: 110.0, pad: [220.0, 261.63, 329.63, 493.88], arp: [440.0, 523.25, 659.25, 987.77] },   // Am(add9)
  { root: 87.31, pad: [174.61, 220.0, 261.63, 392.0], arp: [349.23, 440.0, 523.25, 783.99] },    // Fmaj9-ish
  { root: 130.81, pad: [196.0, 261.63, 293.66, 329.63], arp: [392.0, 523.25, 587.33, 659.25] },  // Cadd9
  { root: 98.0, pad: [196.0, 246.94, 293.66, 440.0], arp: [392.0, 493.88, 587.33, 880.0] },      // G6/9
];
const bars = Math.ceil(DUR / BAR);
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];
const BASS16 = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0];
const SHK = [0.5, 0.18, 0.3, 0.18, 0.55, 0.18, 0.32, 0.22, 0.5, 0.18, 0.3, 0.18, 0.55, 0.2, 0.35, 0.25];

const ARP2 = [0, 1, 2, 3, 1, 2, 3, 2];
for (let b = 0; b < bars; b++) {
  const t = b * BAR, c = CH[b % 4];
  const inHook = t < TL.logo, inOutro = t >= TL.finale;
  const inFeat = t >= TL.features && t < TL.promise; // respiration : pas de grosse caisse
  const inPromise = t >= TL.promise && t < TL.finale;
  const padGain = 1.7 * (inHook ? 0.07 + 0.05 * (t / TL.logo) : inOutro ? 0.14 : inFeat ? 0.13 : 0.11);
  pad(t, BAR + 0.9, c.pad, padGain);
  // arpege de kalimba (clairseme dans l'accroche, variation tous les 8 temps forts)
  const arp = Math.floor(b / 4) % 2 ? ARP2 : ARP;
  for (let k = 0; k < 8; k++) {
    const tt = t + k * 0.25;
    if (tt >= DUR - 0.5) break;
    if (inHook && k % 4 !== 0) continue;
    if (inHook && tt < 1) continue;
    const g = 1.8 * (inHook ? 0.045 : inOutro ? 0.075 : 0.06);
    kalimba(tt, c.arp[arp[k]], g * (k % 2 ? 0.75 : 1), (k % 2 ? 0.4 : -0.4));
    // contre-chant une octave au-dessus pendant la promesse
    if (inPromise && k % 2 === 1) kalimba(tt + 0.125, c.arp[arp[(k + 2) % 8]] * 2, 0.045, k % 4 === 1 ? 0.6 : -0.6);
  }
  if (inHook || inOutro) continue;
  for (let s = 0; s < 16; s++) {
    const tt = t + s * 0.125;
    if (tt >= TL.finale - 0.02) break;
    const full = tt >= TL.phoneStart && !inFeat;
    // shaker
    if (!inFeat || s % 2 === 0) noiseHit(tt + (s % 2 ? 0.012 : 0), 0.12, 0.028, (full ? 0.08 : 0.05) * SHK[s], { pan: 0.25, rev: 0.05 });
    // grosse caisse 4/4
    if (s % 4 === 0 && !inFeat) kick(tt, full ? 0.36 : 0.28);
    // clap sur 2 et 4
    if (full && (s === 4 || s === 12)) clap(tt, 0.16);
    // basse
    if (full && BASS16[s]) bass(tt, c.root * (s === 13 ? 1.5 : 1), 0.3, 0.15);
    if (inFeat && s === 0) bass(tt, c.root, 1.6, 0.12);
    // rimshot syncopé
    if (full && (s === 3 || s === 10)) voice(tt, 0.2, (x) => Math.sin(TAU * 520 * x) * envAD(x, 0.001, 0.03), { gain: 0.05, pan: -0.3, rev: 0.2 });
  }
}
// bourdon sous l'accroche
voice(0, TL.logo + 0.2, (t) => 0.6 * (Math.sin(TAU * 55 * t) + 0.4 * Math.sin(TAU * 82.41 * t)) * Math.min(1, t / 1.2) * Math.max(0, 1 - Math.max(0, t - (TL.logo - 0.1)) / 0.3), { gain: 0.12 });
// battement de coeur
for (let t = 0.5; t < TL.wipe; t += 1) { kick(t, 0.22); kick(t + 0.18, 0.12); }
// problemes : coup sourd a chaque ligne
TL.problemLines.forEach((t) => { kick(t + 0.1, 0.3); noiseHit(t + 0.1, 0.6, 0.12, 0.05, { rev: 0.6, hp: 0.4 }); });

// transitions
riser(1.6, 3.9, 0.18);
riser(6.3, TL.logo, 0.35);
riser(TL.phoneOut - 0.8, TL.features, 0.15);
riser(TL.promise - 1.5, TL.promise, 0.25);
riser(TL.finale - 1.0, TL.finale, 0.12);
impact(TL.logo, 0.5);
impact(TL.features, 0.28);
impact(TL.promise, 0.4);
impact(TL.lockup, 0.5);
[TL.phoneStart, TL.p2, TL.p3, TL.finale].forEach((t) => noiseHit(t, 1.2, 0.25, 0.08, { rev: 0.8, hp: 0.6 }));
// accord final
pad(TL.lockup, DUR - TL.lockup, [220.0, 329.63, 440.0, 493.88, 659.25], 0.2);
kalimba(TL.lockup, 880, 0.09, 0); kalimba(TL.lockup + 0.12, 1318.5, 0.06, 0.3); kalimba(TL.lockup + 0.24, 1760, 0.045, -0.3);

// sons d'interface
TL.msgs.forEach((t, i) => pop(t, 0.22, i === 1 || i === 4 ? 700 : 950));
Object.values(TL.taps).forEach((t) => tap(t, 0.25));
ding(TL.notif, 0.12);
TL.cards.forEach((t, i) => whoosh(t, 0.18, -0.5 + i * 0.1));
TL.steps.forEach((t) => pop(t, 0.12, 1300));
TL.chips.forEach((t) => pop(t, 0.12, 1200));
TL.featureTiles.forEach((t) => pop(t + 0.1, 0.12, 1100));
TL.promiseLines.forEach((t) => whoosh(t - 0.05, 0.12, 0));
whoosh(TL.cv.scan, 0.12, -0.4);
whoosh(TL.cv.del, 0.16, -0.5);
pop(TL.shield + 0.1, 0.14, 1400);
whoosh(TL.phoneStart - 0.05, 0.22, 0.4);
whoosh(TL.phoneOut + 0.1, 0.2, 0.4);
// bip de lecture du QR code
voice(TL.lockup + 2.2, 0.2, (x) => Math.sin(TAU * 2093 * x) * envAD(x, 0.003, 0.05), { gain: 0.1, rev: 0.3 });

// ---------- reverb (Schroeder) ----------
function reverb(inp, out, offs) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ b: new Float32Array(d + offs), i: 0, f: 0.82, lp: 0 }));
  const aps = [225, 556].map((d) => ({ b: new Float32Array(d + offs), i: 0 }));
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of combs) { const y = c.b[c.i]; c.lp = y * 0.7 + c.lp * 0.3; c.b[c.i] = inp[n] + c.lp * c.f; c.i = (c.i + 1) % c.b.length; s += y; }
    s *= 0.25;
    for (const a of aps) { const y = a.b[a.i]; const v = -s + y; a.b[a.i] = s + y * 0.5; a.i = (a.i + 1) % a.b.length; s = v; }
    out[n] += s * 0.55;
  }
}
reverb(sendL, L, 0); reverb(sendR, Rr, 23);

// ---------- master ----------
let peak = 0;
for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(L[n]), Math.abs(Rr[n]));
const g = 1.1 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  const t = n / SR;
  const fade = Math.min(1, t / 0.15) * Math.min(1, (DUR - t) / 1.4);
  const l = Math.tanh(L[n] * g) * 0.89 * fade, r = Math.tanh(Rr[n] * g) * 0.89 * fade;
  buf.writeInt16LE(Math.round(l * 32767), 44 + n * 4); buf.writeInt16LE(Math.round(r * 32767), 46 + n * 4);
}
fs.writeFileSync(__dirname + "/music.wav", buf);
console.log("peak", peak.toFixed(3), "written", (N / SR).toFixed(2), "s");
