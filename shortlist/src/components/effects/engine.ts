// A small canvas particle engine for trade celebrations: confetti pops,
// fireworks with glowing sparks, and fluttering cash bundles, notes and coins.
// It draws on one full-screen canvas, only animates while particles are alive,
// and caps the particle count so low-end phones stay smooth.

type Kind = "confetti" | "spark" | "rocket" | "flash" | "note" | "bundle" | "coin";

interface Particle {
  k: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  tilt: number;
  vt: number;
  color: string;
  hue: number;
  shape: 0 | 1 | 2; // rectangle, circle, star
  sway: number;
  swaySpeed: number;
  seed: number;
  crackle?: boolean;
  bounced?: boolean;
}

const CONFETTI = ["#34d399", "#10b981", "#2dd4bf", "#fbbf24", "#f472b6", "#fb7185", "#a78bfa", "#38bdf8", "#ffffff"];
const GOLD = ["#fde68a", "#fbbf24", "#f59e0b", "#fef3c7", "#34d399", "#ffffff"];
const MAX_PARTICLES = 1400;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export class FxEngine {
  private ctx: CanvasRenderingContext2D;
  private parts: Particle[] = [];
  private raf = 0;
  private last = 0;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private glow = new Map<number, HTMLCanvasElement>();
  private note: HTMLCanvasElement;
  private bundle: HTMLCanvasElement;
  private coin: HTMLCanvasElement;
  /** Called when a firework bursts, so the host can play a boom and a haptic. */
  onBurst?: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.note = drawNote();
    this.bundle = drawBundle(this.note);
    this.coin = drawCoin();
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
  }

  get active(): boolean {
    return this.parts.length > 0;
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.parts = [];
  }

  private later(ms: number, fn: () => void): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }

  private add(p: Particle): void {
    if (this.parts.length >= MAX_PARTICLES) return;
    this.parts.push(p);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  private base(k: Kind, x: number, y: number): Particle {
    return { k, x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 60, max: 60, size: 6, rot: 0, vr: 0, tilt: 0, vt: 0, color: "#fff", hue: 0, shape: 0, sway: 0, swaySpeed: 0, seed: Math.random() * 100 };
  }

  // ---------------------------------------------------------------- spawners

  /** A confetti pop from a point, fanned around `angle` (degrees, -90 = up). */
  confetti(x: number, y: number, opts: { count?: number; spread?: number; angle?: number; power?: number; colors?: string[] } = {}): void {
    const { count = 150, spread = 70, angle = -90, power = 1, colors = CONFETTI } = opts;
    for (let n = 0; n < count; n++) {
      const a = ((angle + rand(-spread / 2, spread / 2)) * Math.PI) / 180;
      const speed = rand(7, 17) * power;
      const life = rand(140, 230);
      this.add({
        ...this.base("confetti", x, y),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        g: 0.28,
        drag: 0.965,
        life,
        max: life,
        size: rand(6, 11),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.25, 0.25),
        tilt: rand(0, Math.PI * 2),
        vt: rand(0.08, 0.22),
        color: pick(colors),
        shape: Math.random() < 0.62 ? 0 : Math.random() < 0.7 ? 1 : 2,
        sway: rand(0.3, 1.2),
        swaySpeed: rand(0.05, 0.12),
      });
    }
  }

  /** Two confetti cannons firing in from the bottom corners. */
  cannons(count = 90, colors = CONFETTI): void {
    this.confetti(-10, this.h + 10, { count, angle: -62, spread: 30, power: 1.45, colors });
    this.confetti(this.w + 10, this.h + 10, { count, angle: -118, spread: 30, power: 1.45, colors });
  }

  /** Launch `n` firework rockets, staggered, bursting high on screen. */
  fireworks(n = 4, stagger = 380): void {
    for (let r = 0; r < n; r++) {
      this.later(r * stagger + rand(0, 120), () => {
        const x = rand(this.w * 0.15, this.w * 0.85);
        const targetY = rand(this.h * 0.12, this.h * 0.42);
        // v^2 = 2 g d  →  initial speed that apexes near targetY
        const g = 0.12;
        const vy = -Math.sqrt(2 * g * (this.h - targetY));
        this.add({ ...this.base("rocket", x, this.h + 6), vx: rand(-1.2, 1.2), vy, g, drag: 1, life: 200, max: 200, size: 2.6, hue: rand(0, 360) });
      });
    }
  }

  /** Cash raining from the top: bundles, loose notes, and a sprinkle of gold. */
  cashRain(n = 26, duration = 1500): void {
    for (let c = 0; c < n; c++) {
      this.later(rand(0, duration), () => {
        const isBundle = Math.random() < 0.45;
        const life = 420;
        this.add({
          ...this.base(isBundle ? "bundle" : "note", rand(-20, this.w + 20), rand(-140, -60)),
          vx: rand(-0.8, 0.8),
          vy: rand(1, 3),
          g: isBundle ? 0.16 : 0.07,
          drag: 1,
          life,
          max: life,
          size: isBundle ? rand(64, 92) : rand(54, 78),
          rot: rand(-0.6, 0.6),
          vr: rand(-0.03, 0.03),
          tilt: rand(0, Math.PI * 2),
          vt: isBundle ? rand(0.02, 0.06) : rand(0.06, 0.16),
          sway: isBundle ? rand(0.2, 0.6) : rand(0.8, 2.2),
          swaySpeed: rand(0.03, 0.07),
        });
      });
    }
    this.later(200, () => this.confetti(this.w / 2, -20, { count: 60, angle: 90, spread: 160, power: 0.5, colors: GOLD }));
  }

  /** Gold coins bursting up from a point and tumbling down. */
  coins(x: number, y: number, n = 36): void {
    for (let c = 0; c < n; c++) {
      const a = ((-90 + rand(-38, 38)) * Math.PI) / 180;
      const speed = rand(9, 17);
      const life = rand(150, 220);
      this.add({ ...this.base("coin", x, y), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, g: 0.42, drag: 0.99, life, max: life, size: rand(18, 28), tilt: rand(0, Math.PI), vt: rand(0.15, 0.35) });
    }
  }

  /** A small twinkle, for orders that are placed but not yet filled. */
  sparkle(x: number, y: number, n = 40): void {
    this.confetti(x, y, { count: n, spread: 360, power: 0.45, colors: ["#a78bfa", "#38bdf8", "#ffffff", "#34d399"] });
  }

  private burst(x: number, y: number, hue: number): void {
    this.onBurst?.();
    const pattern = Math.random();
    const count = Math.round(rand(80, 120));
    const willow = pattern > 0.8;
    const ring = pattern > 0.55 && !willow;
    const baseSpeed = rand(5, 7.5) * Math.min(1.25, Math.max(0.85, this.w / 900));
    for (let s = 0; s < count; s++) {
      const a = (s / count) * Math.PI * 2 + rand(-0.05, 0.05);
      const sp = ring ? baseSpeed * rand(0.92, 1.05) : baseSpeed * (0.25 + 0.75 * Math.sqrt(Math.random()));
      const life = willow ? rand(110, 160) : rand(60, 95);
      const h = willow ? rand(38, 50) : (hue + rand(-22, 22) + 360) % 360;
      this.add({
        ...this.base("spark", x, y),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        g: willow ? 0.035 : 0.06,
        drag: willow ? 0.975 : 0.955,
        life,
        max: life,
        size: rand(1.8, 3),
        hue: Math.random() < 0.12 ? -1 : h, // -1 = white
        crackle: Math.random() < 0.12,
      });
    }
    this.add({ ...this.base("flash", x, y), life: 14, max: 14, size: 70, hue });
  }

  // ------------------------------------------------------------------- loop

  private loop = (t: number) => {
    const f = Math.min(3, (t - this.last) / 16.667);
    this.last = t;
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const next: Particle[] = [];
    const spawn: Particle[] = [];
    for (const p of this.parts) {
      p.life -= f;
      const age = p.max - p.life;
      switch (p.k) {
        case "rocket": {
          p.vy += p.g * f;
          p.x += p.vx * f;
          p.y += p.vy * f;
          if (Math.random() < 0.9) spawn.push({ ...this.base("spark", p.x + rand(-1, 1), p.y + 4), vx: rand(-0.4, 0.4), vy: rand(0.5, 1.6), g: 0.02, drag: 0.94, life: 22, max: 22, size: rand(1, 1.8), hue: 42 });
          if (p.vy >= -1.4 || p.life <= 0) {
            this.burst(p.x, p.y, p.hue);
            continue;
          }
          break;
        }
        case "spark":
          p.vx *= Math.pow(p.drag, f);
          p.vy = p.vy * Math.pow(p.drag, f) + p.g * f;
          p.x += p.vx * f;
          p.y += p.vy * f;
          if (p.crackle && p.life <= 0) for (let c = 0; c < 3; c++) spawn.push({ ...this.base("spark", p.x, p.y), vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), g: 0.03, drag: 0.92, life: 14, max: 14, size: 1.2, hue: -1 });
          break;
        case "flash":
          break;
        case "confetti":
          p.vx *= Math.pow(p.drag, f);
          p.vy = p.vy * Math.pow(p.drag, f) + p.g * f;
          if (p.vy > 3.2) p.vy = 3.2 + (p.vy - 3.2) * 0.9; // flutter, don't plummet
          p.x += p.vx * f + Math.sin(p.seed + age * p.swaySpeed) * p.sway * f;
          p.y += p.vy * f;
          p.rot += p.vr * f;
          p.tilt += p.vt * f;
          break;
        case "note":
        case "bundle": {
          const term = p.k === "bundle" ? 5.2 : 2.6;
          p.vy = Math.min(term, p.vy + p.g * f);
          p.x += p.vx * f + Math.sin(p.seed + age * p.swaySpeed) * p.sway * f;
          p.y += p.vy * f;
          p.rot += p.vr * f + Math.sin(p.seed + age * p.swaySpeed) * 0.004 * f;
          p.tilt += p.vt * f;
          break;
        }
        case "coin":
          p.vx *= Math.pow(p.drag, f);
          p.vy += p.g * f;
          p.x += p.vx * f;
          p.y += p.vy * f;
          p.tilt += p.vt * f;
          if (!p.bounced && p.y > this.h - 18 && p.vy > 0) {
            p.bounced = true;
            p.vy *= -0.42;
            p.vx *= 0.7;
          }
          break;
      }
      const offscreen = p.y > this.h + 140 || p.x < -200 || p.x > this.w + 200;
      if (p.life > 0 && !offscreen) next.push(p);
    }
    this.parts = next.concat(spawn).slice(0, MAX_PARTICLES);

    // Glowing pass (fireworks), then solid pass (confetti, cash, coins).
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.parts) {
      if (p.k === "spark") {
        let a = Math.pow(Math.max(0, p.life / p.max), 1.1);
        if (p.life / p.max < 0.3) a *= 0.55 + 0.45 * Math.random();
        ctx.globalAlpha = a;
        ctx.strokeStyle = `rgb(${this.rgb(p.hue)})`;
        ctx.lineWidth = p.size * 0.9;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 2.6, p.y - p.vy * 2.6);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        const s = p.size * 5.5;
        ctx.drawImage(this.glowSprite(p.hue), p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.k === "rocket") {
        ctx.globalAlpha = 1;
        const s = 16;
        ctx.drawImage(this.glowSprite(42), p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.k === "flash") {
        const r = p.size * (1 + (1 - p.life / p.max) * 0.6);
        ctx.globalAlpha = (p.life / p.max) * 0.32;
        ctx.drawImage(this.glowSprite(p.hue), p.x - r, p.y - r, r * 2, r * 2);
      }
    }
    ctx.globalCompositeOperation = "source-over";
    for (const p of this.parts) {
      if (p.k === "confetti") {
        ctx.globalAlpha = Math.min(1, p.life / 35);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.tilt));
        ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        } else star(ctx, p.size / 2);
        ctx.restore();
      } else if (p.k === "note" || p.k === "bundle") {
        const img = p.k === "note" ? this.note : this.bundle;
        const w = p.size;
        const h = (w * img.height) / img.width;
        ctx.globalAlpha = Math.min(1, p.life / 40);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.max(0.1, Math.abs(Math.cos(p.tilt))));
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else if (p.k === "coin") {
        const s = p.size;
        ctx.globalAlpha = Math.min(1, p.life / 30);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(Math.max(0.12, Math.abs(Math.cos(p.tilt))), 1);
        ctx.drawImage(this.coin, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    if (this.parts.length || this.timers.size) this.raf = requestAnimationFrame(this.loop);
    else {
      this.raf = 0;
      ctx.clearRect(0, 0, this.w, this.h);
    }
  };

  private rgbCache = new Map<number, string>();
  private rgb(hue: number): string {
    const key = hue < 0 ? -1 : Math.round(hue / 10) * 10;
    let v = this.rgbCache.get(key);
    if (!v) {
      v = key < 0 ? "255,255,255" : hslToRgb(key, 100, 66);
      this.rgbCache.set(key, v);
    }
    return v;
  }

  private glowSprite(hue: number): HTMLCanvasElement {
    const key = hue < 0 ? -1 : Math.round(hue / 10) * 10;
    let c = this.glow.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    const col = key < 0 ? "255,255,255" : hslToRgb(key, 100, 62);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, `rgba(${col},1)`);
    grad.addColorStop(0.45, `rgba(${col},0.35)`);
    grad.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this.glow.set(key, c);
    return c;
  }
}

// --------------------------------------------------------------- sprites

function star(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** A £50-style banknote, drawn once and reused. */
function drawNote(): HTMLCanvasElement {
  const W = 280;
  const H = 140;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const body = g.createLinearGradient(0, 0, W, H);
  body.addColorStop(0, "#065f46");
  body.addColorStop(0.45, "#16a34a");
  body.addColorStop(0.55, "#22c55e");
  body.addColorStop(1, "#065f46");
  roundRect(g, 4, 4, W - 8, H - 8, 14);
  g.fillStyle = body;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = "rgba(209,250,229,0.75)";
  g.stroke();
  roundRect(g, 16, 16, W - 32, H - 32, 8);
  g.lineWidth = 2;
  g.strokeStyle = "rgba(255,255,255,0.3)";
  g.stroke();
  // guilloche waves
  g.strokeStyle = "rgba(255,255,255,0.13)";
  g.lineWidth = 1.5;
  for (let k = 0; k < 6; k++) {
    g.beginPath();
    for (let x = 20; x <= W - 20; x += 4) g.lineTo(x, H / 2 + Math.sin(x / 14 + k) * (18 + k * 4));
    g.stroke();
  }
  // portrait oval with £
  g.beginPath();
  g.ellipse(W / 2, H / 2, 38, 34, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.2)";
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = "rgba(255,255,255,0.45)";
  g.stroke();
  g.fillStyle = "#ffffff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "800 46px system-ui, -apple-system, sans-serif";
  g.fillText("£", W / 2, H / 2 + 2);
  g.font = "800 24px system-ui, -apple-system, sans-serif";
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.fillText("50", 42, 36);
  g.fillText("50", W - 42, H - 34);
  return c;
}

/** A banded stack of notes. */
function drawBundle(note: HTMLCanvasElement): HTMLCanvasElement {
  const W = 290;
  const H = 168;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  for (let k = 3; k >= 0; k--) {
    g.globalAlpha = k === 0 ? 1 : 0.92;
    g.drawImage(note, 4 + k * 2, 4 + k * 7, 280, 140);
    if (k > 0) {
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(8 + k * 2, 140 + k * 7, 272, 3);
    }
  }
  g.globalAlpha = 1;
  // paper band
  const bx = W / 2 - 26;
  const band = g.createLinearGradient(bx, 0, bx + 52, 0);
  band.addColorStop(0, "#fde68a");
  band.addColorStop(0.5, "#fffbeb");
  band.addColorStop(1, "#fbbf24");
  g.fillStyle = band;
  g.fillRect(bx, 0, 52, H);
  g.strokeStyle = "rgba(180,83,9,0.6)";
  g.lineWidth = 2;
  g.strokeRect(bx, 0, 52, H);
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-Math.PI / 2);
  g.fillStyle = "#92400e";
  g.font = "800 22px system-ui, -apple-system, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("£1,000", 0, 1);
  g.restore();
  return c;
}

function drawCoin(): HTMLCanvasElement {
  const S = 96;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(S * 0.38, S * 0.34, 4, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "#fef3c7");
  grad.addColorStop(0.35, "#fcd34d");
  grad.addColorStop(0.8, "#f59e0b");
  grad.addColorStop(1, "#b45309");
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = "#fbbf24";
  g.stroke();
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 13, 0, Math.PI * 2);
  g.lineWidth = 2;
  g.strokeStyle = "rgba(146,64,14,0.45)";
  g.stroke();
  g.fillStyle = "#92400e";
  g.font = "900 46px system-ui, -apple-system, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("£", S / 2, S / 2 + 3);
  return c;
}

function hslToRgb(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `${Math.round(f(0) * 255)},${Math.round(f(8) * 255)},${Math.round(f(4) * 255)}`;
}
