// Server-side relay for real-time prices. One set of upstream WebSockets per
// server instance, shared by every browser connected to /api/stream on it:
// ticks are coalesced and pushed out about three times a second.
//
// Upstreams open when the first viewer connects and close a minute after the
// last one leaves. Each reconnects with backoff, and a dead feed never breaks
// the page: the client falls back to delayed quotes or the simulator.
//
// Server only. Uses the WebSocket client built into Node 22+.

import { chooseStreamed, symbolForFinnhub, parseCoinbase, parseFinnhub, toWire, CRYPTO_PRODUCTS, type FeedId, type Tick, type WireTick } from "./feeds";

export type FeedState = "off" | "connecting" | "live" | "error";

export interface FeedStatus {
  state: FeedState;
  detail?: string;
  symbols: string[]; // our symbols this feed is streaming
}

export type StreamStatus = Record<FeedId, FeedStatus>;

interface Client {
  send: (event: string, data: unknown) => void;
  focus: string[];
}

const FLUSH_MS = 300;
const IDLE_CLOSE_MS = 60_000;
const FOCUS_TTL = 2 * 60_000;

const cfg = () => ({
  enabled: process.env.LIVE_STREAM !== "off",
  coinbaseUrl: process.env.COINBASE_WS_URL || "wss://ws-feed.exchange.coinbase.com",
  finnhubUrl: process.env.FINNHUB_WS_URL || "wss://ws.finnhub.io",
  finnhubKey: process.env.FINNHUB_API_KEY || "",
  finnhubLimit: Math.max(1, Math.min(500, Number(process.env.FINNHUB_WS_SYMBOLS) || 50)),
});

class Upstream {
  ws: WebSocket | null = null;
  status: FeedStatus = { state: "off", symbols: [] };
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;

  constructor(
    private readonly url: () => string | null,
    private readonly onOpen: (ws: WebSocket) => void,
    private readonly onMessage: (data: unknown) => void,
    private readonly onStatus: () => void,
  ) {}

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    try {
      this.ws?.close();
    } catch {
      /* already closed */
    }
    this.ws = null;
    this.set({ state: "off", symbols: [] });
  }

  set(s: Partial<FeedStatus>) {
    this.status = { ...this.status, ...s };
    this.onStatus();
  }

  private connect() {
    const url = this.url();
    if (!url) return this.set({ state: "off", detail: "not configured", symbols: [] });
    if (typeof WebSocket === "undefined") return this.set({ state: "error", detail: "this server has no WebSocket client (needs Node 22+)" });
    this.set({ state: "connecting" });
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      return this.fail(String(e));
    }
    this.ws = ws;
    ws.addEventListener("open", () => {
      this.retry = 0;
      this.set({ state: "live", detail: undefined });
      this.onOpen(ws);
    });
    ws.addEventListener("message", (ev) => {
      try {
        this.onMessage(JSON.parse(typeof ev.data === "string" ? ev.data : String(ev.data)));
      } catch {
        /* ignore malformed frames */
      }
    });
    ws.addEventListener("error", () => {
      /* the close handler reconnects */
    });
    ws.addEventListener("close", (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (!this.stopped) this.fail(ev.reason || `closed (${ev.code})`);
    });
  }

  private fail(detail: string) {
    this.set({ state: "error", detail });
    if (this.stopped) return;
    const wait = Math.min(30_000, 1000 * 2 ** this.retry++);
    this.timer = setTimeout(() => this.connect(), wait);
  }
}

class Hub {
  private clients = new Set<Client>();
  private latest = new Map<string, Tick>();
  private dirty = new Set<string>();
  private focus = new Map<string, number>(); // symbol -> expires
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private finnhubSubs = new Set<string>(); // Finnhub symbols currently subscribed
  private statusDirty = false;

  private coinbase = new Upstream(
    () => (cfg().enabled ? cfg().coinbaseUrl : null),
    (ws) => {
      ws.send(JSON.stringify({ type: "subscribe", product_ids: CRYPTO_PRODUCTS.map(([p]) => p), channels: ["ticker"] }));
      this.coinbase.set({ symbols: CRYPTO_PRODUCTS.map(([, s]) => s) });
    },
    (m) => {
      const r = parseCoinbase(m);
      if (r) this.tick(r[0], r[1]);
      const e = m as { type?: string; message?: string; reason?: string };
      if (e?.type === "error") this.coinbase.set({ state: "error", detail: e.reason || e.message || "error" });
    },
    () => (this.statusDirty = true),
  );

  private finnhub = new Upstream(
    () => {
      const c = cfg();
      if (!c.enabled || !c.finnhubKey) return null;
      return `${c.finnhubUrl}${c.finnhubUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(c.finnhubKey)}`;
    },
    () => {
      this.finnhubSubs.clear();
      this.syncFinnhub();
    },
    (m) => {
      for (const [sym, k] of parseFinnhub(m)) this.tick(sym, k);
      const e = m as { type?: string; msg?: string };
      if (e?.type === "error") this.finnhub.set({ detail: e.msg || "error" });
    },
    () => (this.statusDirty = true),
  );

  /** A browser connected. Returns the function to call when it leaves. */
  join(send: Client["send"], focus: string[]): () => void {
    const c: Client = { send, focus: focus.slice(0, 20) };
    this.clients.add(c);
    const exp = Date.now() + FOCUS_TTL;
    for (const s of c.focus) this.focus.set(s, exp);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    this.coinbase.start();
    this.finnhub.start();
    this.syncFinnhub();
    if (!this.flushTimer) this.flushTimer = setInterval(() => this.flush(), FLUSH_MS);
    // Everything we know so far, straight away.
    send("status", this.status());
    const snap: Record<string, WireTick> = {};
    for (const [s, k] of this.latest) snap[s] = toWire(k);
    if (Object.keys(snap).length) send("ticks", snap);
    return () => {
      this.clients.delete(c);
      if (this.clients.size === 0 && !this.idleTimer) this.idleTimer = setTimeout(() => this.sleep(), IDLE_CLOSE_MS);
    };
  }

  status(): StreamStatus {
    return { coinbase: this.coinbase.status, finnhub: this.finnhub.status };
  }

  private tick(sym: string, k: Tick) {
    const prev = this.latest.get(sym);
    if (prev && k.t < prev.t) return;
    // Trades don't carry the day's open/high/low; keep what we already know.
    const merged: Tick = {
      ...k,
      o: k.o ?? prev?.o,
      pc: k.pc ?? prev?.pc,
      h: k.h ?? (prev?.h ? Math.max(prev.h, k.p) : undefined),
      l: k.l ?? (prev?.l ? Math.min(prev.l, k.p) : undefined),
    };
    this.latest.set(sym, merged);
    this.dirty.add(sym);
  }

  private flush() {
    if (this.statusDirty) {
      this.statusDirty = false;
      this.broadcast("status", this.status());
    }
    if (!this.dirty.size) return;
    const out: Record<string, WireTick> = {};
    for (const s of this.dirty) {
      const k = this.latest.get(s);
      if (k) out[s] = toWire(k);
    }
    this.dirty.clear();
    this.broadcast("ticks", out);
  }

  private broadcast(event: string, data: unknown) {
    for (const c of this.clients) {
      try {
        c.send(event, data);
      } catch {
        this.clients.delete(c);
      }
    }
  }

  /** Keep the capped Finnhub subscription list on what people are viewing. */
  private syncFinnhub() {
    const ws = this.finnhub.ws;
    const now = Date.now();
    for (const [s, exp] of this.focus) if (exp < now) this.focus.delete(s);
    const focus = [...this.focus.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
    const want = new Set(chooseStreamed(focus, cfg().finnhubLimit));
    if (!ws || ws.readyState !== 1) return;
    for (const s of this.finnhubSubs) if (!want.has(s)) ws.send(JSON.stringify({ type: "unsubscribe", symbol: s }));
    for (const s of want) if (!this.finnhubSubs.has(s)) ws.send(JSON.stringify({ type: "subscribe", symbol: s }));
    this.finnhubSubs = want;
    this.finnhub.set({ symbols: [...want].map(symbolForFinnhub) });
  }

  private sleep() {
    this.idleTimer = null;
    if (this.clients.size) return;
    this.coinbase.stop();
    this.finnhub.stop();
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    this.finnhubSubs.clear();
  }
}

// One hub per server process, surviving hot reloads in development.
const g = globalThis as unknown as { __shortlistHub?: Hub };
export const hub: Hub = g.__shortlistHub ?? (g.__shortlistHub = new Hub());
