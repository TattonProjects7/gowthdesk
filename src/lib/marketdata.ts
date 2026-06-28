// Server-only market-data layer. Pulls REAL prices when an API key is present,
// and returns null otherwise so the app transparently falls back to the
// built-in simulator. Two optional providers, both free-tier friendly:
//   • FINNHUB_API_KEY     → real-time quotes        (finnhub.io)
//   • ALPHAVANTAGE_API_KEY → daily candle history   (alphavantage.co)
//
// Nothing here runs unless a key is configured, so the keyless demo never makes
// a network call. Only imported from server routes (never bundled to client).

const FINNHUB = process.env.FINNHUB_API_KEY;
const ALPHA = process.env.ALPHAVANTAGE_API_KEY;

export function hasLiveData(): boolean {
  return Boolean(FINNHUB || ALPHA);
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

// Real-time last price via Finnhub. Returns null if unconfigured or on error.
export async function fetchQuote(symbol: string): Promise<number | null> {
  if (!FINNHUB) return null;
  const res = await withTimeout(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB}`);
  if (!res) return null;
  try {
    const j = (await res.json()) as { c?: number };
    return typeof j.c === "number" && j.c > 0 ? j.c : null;
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
