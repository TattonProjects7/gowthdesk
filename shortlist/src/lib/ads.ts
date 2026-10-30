// Advertising: where ads may appear, and which network serves them.
//
//   • Web: Google AdSense display units (NEXT_PUBLIC_ADSENSE_CLIENT + _SLOT).
//   • iOS / Android apps: one Google AdMob anchored banner at the bottom of the
//     screen (NEXT_PUBLIC_ADMOB_BANNER_IOS / _ANDROID). AdSense isn't allowed
//     inside app web views, so the apps use the native SDK instead.
//   • Neither configured: tasteful Shortlist promos fill the same spaces, so the
//     layout is ready the day the networks are approved.
//
// Ads never appear in real-money mode, on trading, account, sign-in or legal
// screens, or for anyone with the ad-free plan or Pro.

export const AD_CONFIG = {
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "", // "ca-pub-…"
  adsenseSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? "", // a responsive display unit
  adsenseInFeedSlot: process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT ?? "", // optional, for news lists
  admobBannerIos: process.env.NEXT_PUBLIC_ADMOB_BANNER_IOS ?? "",
  admobBannerAndroid: process.env.NEXT_PUBLIC_ADMOB_BANNER_ANDROID ?? "",
  /** Serve Google's test ads in the apps (for checking the integration before launch). */
  admobTesting: process.env.NEXT_PUBLIC_ADMOB_TEST === "1",
};

export const AD_FREE_PRICE = "£6.99";

// Screens that carry ads: the research and learning tools. Everything to do
// with money, orders, accounts and the law stays clean.
const AD_ROUTES = ["/markets", "/screener", "/maps", "/groups", "/charts", "/news", "/calendar", "/watchlist", "/learn", "/i/"];
const NO_AD_ROUTES = ["/learn/"]; // inside a lesson: no distractions
// The quote page has a deal ticket, so it only carries an ad on the web, well
// below the ticket, and never a banner in the apps where it would sit over the
// buy button.
const NATIVE_EXCLUDED = ["/i/"];

export interface AdContext {
  path: string;
  native: boolean;
  /** Ad-free plan or Pro. */
  adFree: boolean;
  /** "real" when the user is looking at their live broker account. */
  mode: "demo" | "real";
  /** Entitlement still loading — hold off rather than flash an ad at a subscriber. */
  loading?: boolean;
}

export function adsAllowed(c: AdContext): boolean {
  if (c.adFree || c.loading) return false;
  if (c.mode === "real") return false;
  const p = c.path || "/";
  if (NO_AD_ROUTES.some((r) => p.startsWith(r) && p.length > r.length)) return false;
  if (!AD_ROUTES.some((r) => (r.endsWith("/") ? p.startsWith(r) : p === r || p.startsWith(`${r}/`) || p.startsWith(`${r}?`)))) return false;
  if (c.native && NATIVE_EXCLUDED.some((r) => p.startsWith(r))) return false;
  return true;
}

export type AdNetwork = "adsense" | "admob" | "house";

export function webNetwork(cfg = AD_CONFIG): AdNetwork {
  return cfg.adsenseClient && cfg.adsenseSlot ? "adsense" : "house";
}

export function nativeBannerId(platform: "ios" | "android" | "web", cfg = AD_CONFIG): string {
  if (platform === "ios") return cfg.admobBannerIos || (cfg.admobTesting ? "ca-app-pub-3940256099942544/2934735716" : "");
  if (platform === "android") return cfg.admobBannerAndroid || (cfg.admobTesting ? "ca-app-pub-3940256099942544/6300978111" : "");
  return "";
}

/** "pub-1234…" from "ca-pub-1234…", for ads.txt. */
export function publisherId(client = AD_CONFIG.adsenseClient): string {
  const m = client.match(/pub-\d+/);
  return m ? m[0] : "";
}

/** The ads.txt / app-ads.txt line that authorises Google to sell this inventory. */
export function adsTxt(pub: string): string {
  if (!pub) return "# Advertising isn't configured yet.\n";
  return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
}
