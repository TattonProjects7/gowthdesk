// Synthesised sound effects for trade celebrations: no audio files to load.
// Browsers only allow audio after a user gesture, so `unlockAudio()` is called
// on the first tap anywhere, and trade sounds are triggered from the tap that
// placed the order.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.2;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio(): void {
  ac();
}

function noise(c: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf;
  const len = c.sampleRate;
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function tone(freq: number, at: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number } = {}): void {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(at: number, dur: number, opts: { type?: BiquadFilterType; freq?: number; gain?: number; q?: number } = {}): void {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = opts.type ?? "bandpass";
  f.frequency.value = opts.freq ?? 1200;
  f.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

export const sfx = {
  /** Confetti pop plus a rising major arpeggio. */
  buy(): void {
    hiss(0, 0.09, { freq: 1800, gain: 0.5, q: 0.6 });
    tone(520, 0, 0.12, { type: "sine", gain: 0.25, to: 140 });
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, 0.06 + i * 0.07, 0.38, { type: "triangle", gain: 0.12 }));
  },
  /** One firework: a low boom and a crackle tail. */
  burst(): void {
    tone(90, 0, 0.5, { type: "sine", gain: 0.35, to: 40 });
    hiss(0, 0.45, { type: "lowpass", freq: 500, gain: 0.35 });
    for (let k = 0; k < 9; k++) hiss(0.12 + Math.random() * 0.5, 0.03, { freq: 3500 + Math.random() * 3000, gain: 0.18, q: 4 });
  },
  /** Cash register "cha-ching" with coins jingling. */
  sell(): void {
    hiss(0, 0.07, { type: "lowpass", freq: 900, gain: 0.4 });
    tone(1318.5, 0.02, 0.5, { gain: 0.18 });
    tone(2637, 0.02, 0.4, { gain: 0.08 });
    tone(1760, 0.16, 0.7, { gain: 0.2 });
    tone(3520, 0.16, 0.55, { gain: 0.09 });
    for (let k = 0; k < 10; k++) tone(3000 + Math.random() * 2200, 0.25 + Math.random() * 0.6, 0.12, { gain: 0.05 });
  },
  /** A soft blip for a working (unfilled) order. */
  placed(): void {
    tone(880, 0, 0.14, { type: "triangle", gain: 0.12 });
    tone(1320, 0.08, 0.2, { type: "triangle", gain: 0.1 });
  },
};
