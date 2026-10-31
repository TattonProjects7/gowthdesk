import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { guessT212Ticker, resolveT212Ticker, symbolFromT212, validateRealOrder, realTradable } from "@/lib/broker/tickers";
import { seal, unseal, sameOriginWrite, brokerConfigured } from "@/lib/broker/session";
import { authHeader, BrokerError, cancelOrder, getAccount, getInfo, mapOrder, placeOrder, resetInstrumentMeta, t212Base } from "@/lib/broker/t212";

describe("Trading 212 ticker mapping", () => {
  it("maps US and London listings both ways, and skips crypto", () => {
    expect(guessT212Ticker("AAPL")).toBe("AAPL_US_EQ");
    expect(guessT212Ticker("VUSA")).toBe("VUSAl_EQ");
    expect(guessT212Ticker("LLOY")).toBe("LLOYl_EQ");
    expect(guessT212Ticker("BTC")).toBeNull();
    expect(realTradable("BTC")).toBe(false);
    expect(symbolFromT212("AAPL_US_EQ")).toBe("AAPL");
    expect(symbolFromT212("VUSAl_EQ")).toBe("VUSA");
    expect(symbolFromT212("ZZZZ_US_EQ")).toBeNull();
  });

  it("prefers the broker's own instrument list when it has one", () => {
    const meta = [{ ticker: "LLOYl_EQ_X", shortName: "LLOY", currencyCode: "GBX" }];
    expect(resolveT212Ticker("LLOY", meta)).toBe("LLOYl_EQ_X");
    expect(resolveT212Ticker("LLOY", [{ ticker: "LLOYl_EQ", shortname: "LLOY", currencyCode: "GBX" }])).toBe("LLOYl_EQ");
    expect(resolveT212Ticker("AAPL", [])).toBe("AAPL_US_EQ");
  });
});

describe("real order validation", () => {
  it("accepts a sound order and rounds the quantity", () => {
    const v = validateRealOrder({ symbol: "AAPL", side: "buy", type: "market", quantity: 1.23456789 });
    expect(v).toEqual({ ok: true, order: { symbol: "AAPL", side: "buy", type: "market", quantity: 1.234568 } });
  });
  it("requires prices for limit and stop orders and defaults to a day order", () => {
    expect(validateRealOrder({ symbol: "AAPL", side: "buy", type: "limit", quantity: 1 }).ok).toBe(false);
    const v = validateRealOrder({ symbol: "AAPL", side: "sell", type: "stop", quantity: 2, stopPrice: 180 });
    expect(v).toEqual({ ok: true, order: { symbol: "AAPL", side: "sell", type: "stop", quantity: 2, stopPrice: 180, timeValidity: "DAY" } });
  });
  it("rejects nonsense", () => {
    expect(validateRealOrder({ symbol: "NOPE", side: "buy", type: "market", quantity: 1 })).toMatchObject({ ok: false, error: "Unknown instrument." });
    expect(validateRealOrder({ symbol: "BTC", side: "buy", type: "market", quantity: 1 }).ok).toBe(false);
    expect(validateRealOrder({ symbol: "AAPL", side: "buy", type: "market", quantity: 0 }).ok).toBe(false);
    expect(validateRealOrder({ symbol: "AAPL", side: "hold" as never, type: "market", quantity: 1 }).ok).toBe(false);
    expect(validateRealOrder({ symbol: "AAPL", side: "buy", type: "market", quantity: Number.NaN }).ok).toBe(false);
  });
});

describe("broker session cookie", () => {
  const prev = process.env.BROKER_SECRET;
  beforeEach(() => {
    process.env.BROKER_SECRET = "test-secret-that-is-long-enough";
  });
  afterEach(() => {
    process.env.BROKER_SECRET = prev;
  });

  it("round-trips and hides the key", () => {
    const token = seal({ v: 1, env: "live", key: "KEY123456", secret: "S3CRET", accountId: 42, currency: "GBP", at: 1 });
    expect(token).not.toContain("KEY123456");
    expect(unseal(token)).toMatchObject({ env: "live", key: "KEY123456", secret: "S3CRET", accountId: 42 });
  });

  it("rejects tampering, other secrets and a missing secret", () => {
    const token = seal({ v: 1, env: "demo", key: "KEY123456", accountId: 1, currency: "GBP", at: 1 });
    const bad = token.slice(0, -4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(unseal(bad)).toBeNull();
    process.env.BROKER_SECRET = "a-completely-different-secret";
    expect(unseal(token)).toBeNull();
    process.env.BROKER_SECRET = "";
    expect(brokerConfigured()).toBe(false);
    expect(unseal(token)).toBeNull();
  });

  it("only accepts writes from our own pages", () => {
    const mk = (h: Record<string, string>) => new Request("https://app.example/api/broker/orders", { method: "POST", headers: h });
    expect(sameOriginWrite(mk({ "x-shortlist": "1", origin: "https://app.example", host: "app.example" }))).toBe(true);
    expect(sameOriginWrite(mk({ "x-shortlist": "1", host: "app.example" }))).toBe(true);
    expect(sameOriginWrite(mk({ origin: "https://app.example", host: "app.example" }))).toBe(false);
    expect(sameOriginWrite(mk({ "x-shortlist": "1", origin: "https://evil.example", host: "app.example" }))).toBe(false);
  });
});

describe("Trading 212 client", () => {
  const calls: { url: string; init: RequestInit }[] = [];
  let responses: { status: number; body: unknown }[] = [];
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    calls.length = 0;
    responses = [];
    delete process.env.T212_API_BASE;
    resetInstrumentMeta();
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      const r = responses.shift() ?? { status: 200, body: {} };
      return new Response(r.body == null ? "" : JSON.stringify(r.body), { status: r.status });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it("uses the right server and auth for each key type", async () => {
    expect(t212Base("demo")).toBe("https://demo.trading212.com");
    expect(t212Base("live")).toBe("https://live.trading212.com");
    expect(authHeader({ env: "live", key: "abc" })).toBe("abc");
    expect(authHeader({ env: "live", key: "id", secret: "sec" })).toBe(`Basic ${Buffer.from("id:sec").toString("base64")}`);
    responses.push({ status: 200, body: { id: 7, currencyCode: "GBP" } });
    expect(await getInfo({ env: "demo", key: "k" })).toEqual({ id: 7, currencyCode: "GBP" });
    expect(calls[0].url).toBe("https://demo.trading212.com/api/v0/equity/account/info");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("k");
  });

  it("sends sells as a negative quantity and maps the response", async () => {
    responses.push({ status: 200, body: [] }); // instrument metadata (empty → naming pattern)
    responses.push({ status: 200, body: { id: 99, ticker: "AAPL_US_EQ", type: "MARKET", status: "NEW", quantity: -2, filledQuantity: 0 } });
    const o = await placeOrder({ env: "live", key: "k" }, { symbol: "AAPL", side: "sell", type: "market", quantity: 2 });
    const sent = JSON.parse(String(calls[1].init.body));
    expect(calls[1].url).toBe("https://live.trading212.com/api/v0/equity/orders/market");
    expect(sent).toEqual({ ticker: "AAPL_US_EQ", quantity: -2 });
    expect(o).toMatchObject({ id: 99, side: "sell", quantity: 2, symbol: "AAPL", status: "NEW" });
  });

  it("places limit orders with a time validity", async () => {
    process.env.T212_API_BASE = "http://127.0.0.1:4010";
    responses.push({ status: 200, body: [] });
    responses.push({ status: 200, body: { id: 5, ticker: "VUSAl_EQ", type: "LIMIT", status: "NEW", quantity: 3, limitPrice: 80 } });
    await placeOrder({ env: "demo", key: "k" }, { symbol: "VUSA", side: "buy", type: "limit", quantity: 3, limitPrice: 80, timeValidity: "DAY" });
    expect(calls[1].url).toBe("http://127.0.0.1:4010/api/v0/equity/orders/limit");
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ ticker: "VUSAl_EQ", quantity: 3, limitPrice: 80, timeValidity: "DAY" });
  });

  it("turns broker errors into plain-English messages", async () => {
    responses.push({ status: 401, body: {} });
    await expect(getInfo({ env: "live", key: "bad" })).rejects.toMatchObject({ status: 401 });
    responses.push({ status: 200, body: [] });
    responses.push({ status: 400, body: { code: "InsufficientFreeForStocksBuy" } });
    const err = await placeOrder({ env: "live", key: "k" }, { symbol: "AAPL", side: "buy", type: "market", quantity: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(BrokerError);
    expect(err.message).toMatch(/Not enough free cash/);
    responses.push({ status: 429, body: {} });
    await expect(cancelOrder({ env: "live", key: "k" }, 1)).rejects.toMatchObject({ status: 429 });
  });

  it("assembles the account view", async () => {
    responses.push({ status: 200, body: { free: 100, total: 1100, invested: 1000, ppl: 25, result: 5, blocked: null, pieCash: 0 } });
    responses.push({ status: 200, body: [{ ticker: "AAPL_US_EQ", quantity: 3, averagePrice: 200, currentPrice: 210, ppl: 25, fxPpl: null, maxSell: 3 }] });
    responses.push({ status: 200, body: [{ id: 1, ticker: "VUSAl_EQ", type: "LIMIT", status: "NEW", quantity: -1, limitPrice: 95 }] });
    const a = await getAccount({ env: "demo", key: "k" }, "GBP");
    expect(a.cash.total).toBe(1100);
    expect(a.positions[0]).toMatchObject({ symbol: "AAPL", quantity: 3 });
    expect(a.orders[0]).toMatchObject({ symbol: "VUSA", side: "sell", quantity: 1, limitPrice: 95 });
  });

  it("reads order side from the quantity sign", () => {
    expect(mapOrder({ id: 1, ticker: "AAPL_US_EQ", type: "MARKET", status: "FILLED", quantity: 4 }).side).toBe("buy");
    expect(mapOrder({ id: 2, ticker: "AAPL_US_EQ", type: "MARKET", status: "FILLED", quantity: -4 }).side).toBe("sell");
  });
});
