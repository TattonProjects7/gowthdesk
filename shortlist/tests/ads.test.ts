import { describe, it, expect } from "vitest";
import { adsAllowed, adsTxt, nativeBannerId, publisherId, webNetwork } from "@/lib/ads";
import { isActive, planForPrice, rowsFromRevenueCat } from "@/lib/entitlements";
import { aggregateBars, simBars } from "@/lib/bars";
import { INSTRUMENTS } from "@/lib/instruments";
import { priceAt } from "@/lib/market";
import { fundamentalsFor } from "@/lib/fundamentals";
import { buildSnapshot, rankSignals, benchmarkFor, type Snapshot } from "@/lib/screener/snapshot";
import { pulseNotes } from "@/lib/screener/pulse";
import { allTokens, runScreen } from "@/lib/screener/filters";
import { THEMES } from "@/lib/universe";

const base = { native: false, adFree: false, mode: "demo" as const };

describe("where ads may appear", () => {
  it("shows ads on research and learning screens", () => {
    for (const path of ["/markets", "/screener", "/maps", "/groups", "/charts", "/news", "/calendar", "/watchlist", "/learn", "/i/AAPL"]) {
      expect(adsAllowed({ ...base, path }), path).toBe(true);
    }
  });

  it("keeps trading, account, legal and lesson screens clean", () => {
    for (const path of ["/", "/portfolio", "/settings", "/pricing", "/login", "/terms", "/privacy", "/learn/what-is-a-share", "/scan", "/short/TSLA", "/tracker"]) {
      expect(adsAllowed({ ...base, path }), path).toBe(false);
    }
  });

  it("never shows ads to ad-free users, in real-money mode, or while the plan is loading", () => {
    expect(adsAllowed({ ...base, path: "/markets", adFree: true })).toBe(false);
    expect(adsAllowed({ ...base, path: "/markets", mode: "real" })).toBe(false);
    expect(adsAllowed({ ...base, path: "/markets", loading: true })).toBe(false);
  });

  it("keeps the app banner off the quote page, where the buy button lives", () => {
    expect(adsAllowed({ ...base, path: "/i/AAPL", native: true })).toBe(false);
    expect(adsAllowed({ ...base, path: "/screener", native: true })).toBe(true);
  });

  it("picks the network from configuration", () => {
    expect(webNetwork({ adsenseClient: "", adsenseSlot: "", adsenseInFeedSlot: "", admobBannerIos: "", admobBannerAndroid: "", admobTesting: false })).toBe("house");
    expect(webNetwork({ adsenseClient: "ca-pub-123", adsenseSlot: "999", adsenseInFeedSlot: "", admobBannerIos: "", admobBannerAndroid: "", admobTesting: false })).toBe("adsense");
    const cfg = { adsenseClient: "", adsenseSlot: "", adsenseInFeedSlot: "", admobBannerIos: "", admobBannerAndroid: "", admobTesting: false };
    expect(nativeBannerId("ios", cfg)).toBe("");
    expect(nativeBannerId("ios", { ...cfg, admobTesting: true })).toMatch(/^ca-app-pub-3940256099942544\//);
    expect(nativeBannerId("android", { ...cfg, admobBannerAndroid: "ca-app-pub-1/2" })).toBe("ca-app-pub-1/2");
  });

  it("writes ads.txt from the publisher id", () => {
    expect(publisherId("ca-pub-1234567890")).toBe("pub-1234567890");
    expect(adsTxt("pub-1234567890")).toBe("google.com, pub-1234567890, DIRECT, f08c47fec0942fa0\n");
    expect(adsTxt("")).toMatch(/^#/);
  });
});

describe("ad-free entitlements", () => {
  const user = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

  it("routes Stripe prices to the right plan", () => {
    expect(planForPrice("price_ad", { adFreePrice: "price_ad" })).toBe("ad_free");
    expect(planForPrice("price_pro", { adFreePrice: "price_ad" })).toBe("pro");
    expect(planForPrice(undefined, {})).toBe("pro");
  });

  it("mirrors App Store and Play purchases for signed-in users", () => {
    const now = Date.UTC(2026, 9, 30);
    const rows = rowsFromRevenueCat({ type: "INITIAL_PURCHASE", app_user_id: user, entitlement_ids: ["ad_free"], expiration_at_ms: now + 30 * 86400_000, store: "APP_STORE" }, now);
    expect(rows).toEqual([expect.objectContaining({ user_id: user, entitlement: "ad_free", source: "app_store", active: true })]);
    // Cancelling keeps access until the period ends; expiry removes it.
    expect(rowsFromRevenueCat({ type: "CANCELLATION", app_user_id: user, entitlement_ids: ["ad_free"], expiration_at_ms: now + 5 * 86400_000, store: "PLAY_STORE" }, now)[0]).toMatchObject({ active: true, source: "play_store" });
    expect(rowsFromRevenueCat({ type: "EXPIRATION", app_user_id: user, entitlement_ids: ["ad_free"], expiration_at_ms: now - 1, store: "PLAY_STORE" }, now)[0].active).toBe(false);
    // Anonymous app users can't be linked to an account; unknown entitlements are ignored.
    expect(rowsFromRevenueCat({ type: "INITIAL_PURCHASE", app_user_id: "$RCAnonymousID:abc", entitlement_ids: ["ad_free"] }, now)).toEqual([]);
    expect(rowsFromRevenueCat({ type: "INITIAL_PURCHASE", app_user_id: user, entitlement_ids: ["gold"] }, now)).toEqual([]);
    // An alias that is a Shortlist user still links.
    expect(rowsFromRevenueCat({ type: "RENEWAL", app_user_id: "$RCAnonymousID:x", aliases: [user], entitlement_ids: ["pro"], store: "APP_STORE" }, now)[0]).toMatchObject({ user_id: user, entitlement: "pro" });
  });

  it("treats expired rows as inactive", () => {
    const now = Date.UTC(2026, 9, 30);
    expect(isActive({ active: true, expires_at: null }, now)).toBe(true);
    expect(isActive({ active: true, expires_at: new Date(now + 1000).toISOString() }, now)).toBe(true);
    expect(isActive({ active: true, expires_at: new Date(now - 1000).toISOString() }, now)).toBe(false);
    expect(isActive({ active: false, expires_at: null }, now)).toBe(false);
  });
});

describe("charts and news helpers", () => {
  const T = Date.UTC(2026, 9, 21, 15, 30);

  it("rolls daily bars into weeks and months without losing the range", () => {
    const daily = simBars("AAPL", T, 400);
    const weeks = aggregateBars(daily, "W");
    const months = aggregateBars(daily, "M");
    expect(weeks.length).toBeGreaterThan(55);
    expect(weeks.length).toBeLessThan(60);
    expect(months.length).toBeGreaterThanOrEqual(13);
    expect(Math.max(...weeks.map((b) => b.h))).toBeCloseTo(Math.max(...daily.map((b) => b.h)), 6);
    expect(weeks[weeks.length - 1].c).toBe(daily[daily.length - 1].c);
    expect(weeks.reduce((a, b) => a + b.v, 0)).toBe(daily.reduce((a, b) => a + b.v, 0));
    // Weeks start on a Monday.
    expect(new Date(weeks[2].t).getUTCDay()).toBe(1);
  });

  it("writes a market pulse from the data", () => {
    const snaps: Snapshot[] = [];
    for (const i of INSTRUMENTS) {
      const s = buildSnapshot({ symbol: i.symbol, bars: simBars(i.symbol, T, 400), now: T, market: simBars(benchmarkFor(i), T, 400), fund: fundamentalsFor(i.symbol, priceAt(i.symbol, T)) });
      if (s) snaps.push(s);
    }
    rankSignals(snaps);
    const notes = pulseNotes(snaps);
    expect(notes.length).toBeGreaterThan(5);
    expect(notes[0].id).toBe("breadth");
    expect(notes.some((n) => n.symbol && /rises|falls/.test(n.headline))).toBe(true);

    // Themes and the tickers box.
    const valid = new Set(allTokens());
    for (const id of Object.keys(THEMES)) expect(valid.has(`theme:${id}`)).toBe(true);
    for (const t of Object.values(THEMES)) for (const sym of t.symbols) expect(INSTRUMENTS.some((i) => i.symbol === sym), sym).toBe(true);
    const ai = runScreen(snaps, { filters: ["theme:ai"] });
    expect(ai.every((s) => THEMES.ai.symbols.includes(s.symbol))).toBe(true);
    expect(runScreen(snaps, { filters: [], tickers: ["aapl", "LLOY", "NOPE"] }).map((s) => s.symbol).sort()).toEqual(["AAPL", "LLOY"]);
  });
});
