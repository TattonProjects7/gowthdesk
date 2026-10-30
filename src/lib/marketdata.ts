// Server-only market-data layer. Pulls REAL prices when an API key is present,
// and returns null otherwise so the app transparently falls back to the
// built-in simulator. Two optional providers, both free-tier friendly:
//   • FINNHUB_API_KEY      → real-time quotes + company news   (finnhub.io)
//   • ALPHAVANTAGE_API_KEY → daily candle history               (alphavantage.co)
//
// Nothing here runs unless a key is configured, so the keyless demo never makes
// a network call. Only imported from server routes (never bundled to client).

const FINNHUB = process.env.FINNHUB_API_KEY;
const ALPHA = process.env.ALPHAVANTAGE_API_KEY;

export function hasLiveData(): boolean {
  return Boolean(FINNHUB || ALPHA);
}

export function hasNews(): boolean {
  return Boolean(FINNHUB);
}

async function withTimeout(url: string, ms = 4000): Promise<Response | null> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

export interface LiveQuote {
  c: number; // last
  o?: number; // today's open
  h?: number; // today's high
  l?: number; // today's low
  pc?: number; // previous close
}

// Real-time quote via Finnhub. `providerSymbol` is Finnhub's own ticker
// (e.g. "AAPL", "LLOY.L", "BINANCE:BTCUSDT"). Returns null if unconfigured or on error.
export async function fetchLiveQuote(providerSymbol: string): Promise<LiveQuote | null> {
  if (!FINNHUB) return null;
  const res = await withTimeout(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(providerSymbol)}&token=${FINNHUB}`);
  if (!res) return null;
  try {
    const j = (await res.json()) as { c?: number; o?: number; h?: number; l?: number; pc?: number };
    if (!(typeof j.c === "number" && j.c > 0)) return null;
    const pos = (n?: number) => (typeof n === "number" && n > 0 ? n : undefined);
    return { c: j.c, o: pos(j.o), h: pos(j.h), l: pos(j.l), pc: pos(j.pc) };
  } catch {
    return null;
  }
}

// Last price only (kept for callers that just need a number).
export async function fetchQuote(providerSymbol: string): Promise<number | null> {
  return (await fetchLiveQuote(providerSymbol))?.c ?? null;
}

// Finnhub basic financials + analyst recommendation trend (both free-tier).
export async function fetchFinnhubFundamentals(
  providerSymbol: string,
): Promise<{ metric: Record<string, number | null>; recommendation: { strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number } | null } | null> {
  if (!FINNHUB) return null;
  const [m, r] = await Promise.all([
    withTimeout(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(providerSymbol)}&metric=all&token=${FINNHUB}`, 6000),
    withTimeout(`https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(providerSymbol)}&token=${FINNHUB}`, 6000),
  ]);
  if (!m) return null;
  try {
    const mj = (await m.json()) as { metric?: Record<string, number | null> };
    if (!mj.metric || !Object.keys(mj.metric).length) return null;
    let rec = null;
    if (r) {
      const rj = (await r.json()) as { strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number }[];
      rec = Array.isArray(rj) && rj.length ? rj[0] : null;
    }
    return { metric: mj.metric, recommendation: rec };
  } catch {
    return null;
  }
}

// ~31 most-recent daily closes via Alpha Vantage. Returns null if unconfigured
// or on error / rate-limit.
export async function fetchDailyCloses(symbol: string): Promise<number[] | null> {
  if (!ALPHA) return null;
  const res = await withTimeout(
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA}`,
  );
  if (!res) return null;
  try {
    const j = (await res.json()) as { "Time Series (Daily)"?: Record<string, { "4. close": string }> };
    const series = j["Time Series (Daily)"];
    if (!series) return null; // rate-limited or unknown symbol
    const closes = Object.keys(series)
      .sort() // ascending dates
      .map((d) => parseFloat(series[d]["4. close"]))
      .filter((n) => Number.isFinite(n));
    return closes.length >= 20 ? closes.slice(-31) : null;
  } catch {
    return null;
  }
}

export interface ProviderNews {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  at: number;
}

// Company news for the last 14 days via Finnhub.
export async function fetchCompanyNews(providerSymbol: string): Promise<ProviderNews[]> {
  if (!FINNHUB) return [];
  const to = new Date();
  const from = new Date(to.getTime() - 14 * 86400_000);
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const res = await withTimeout(
    `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(providerSymbol)}&from=${d(from)}&to=${d(to)}&token=${FINNHUB}`,
    5000,
  );
  if (!res) return [];
  try {
    const j = (await res.json()) as { id?: number; headline?: string; summary?: string; source?: string; url?: string; datetime?: number }[];
    if (!Array.isArray(j)) return [];
    return j
      .filter((n) => n.headline && n.url)
      .slice(0, 12)
      .map((n, i) => ({
        id: `n:${n.id ?? i}`,
        headline: n.headline as string,
        summary: (n.summary ?? "").slice(0, 280),
        source: n.source ?? "News",
        url: n.url as string,
        at: (n.datetime ?? 0) * 1000,
      }));
  } catch {
    return [];
  }
}
