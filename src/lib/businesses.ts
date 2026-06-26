export interface Business {
  slug: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  niche: string;
  audience: string;
  location: string;
  competitors: string[];
  accent: string;
  emoji: string;
}

export const BUSINESSES: Business[] = [
  {
    slug: "estimate",
    name: "EstiMate",
    url: "https://esti-mate.app",
    tagline: "Quoting and estimating app for UK tradespeople",
    description:
      "EstiMate is a SaaS app for UK builders, plumbers, electricians and contractors. It creates professional PDF quotes, tracks payment milestones, manages jobs, and includes an AI room visualiser. Monthly subscription model — designed for sole traders and small firms.",
    niche: "Trade software / Construction SaaS / UK tradespeople",
    audience:
      "UK builders, plumbers, electricians, roofers, joiners, landscapers, tilers and other self-employed tradespeople",
    location: "United Kingdom",
    competitors: ["Jobber", "Tradify", "BuilderTrend", "QuoteOnSite", "Fergus"],
    accent: "#d97706", // amber
    emoji: "⚡",
  },
  {
    slug: "silopod",
    name: "SiloPod",
    url: "https://silopod.co.uk",
    tagline: "Acoustic office pods and quiet workspace solutions",
    description:
      "SiloPod manufactures and sells acoustic office pods and soundproofed quiet pods for workplaces. Products include solo focus pods, phone booth pods, and multi-person meeting pods — all acoustically engineered to block out open-plan office noise. Used by offices, co-working spaces, schools and businesses across the UK.",
    niche: "Acoustic pods / Office pods / Soundproofed workspace / Quiet rooms / Office furniture",
    audience:
      "Office managers, HR teams, facilities managers and business owners looking to solve open-plan office noise problems with acoustic pods or quiet workspace solutions",
    location: "United Kingdom",
    competitors: ["Framery", "Hana", "ROOM", "Zenbooth", "SnapCab", "Pod Works"],
    accent: "#16a34a", // green
    emoji: "🔇",
  },
  {
    slug: "tatton-projects",
    name: "Tatton Projects",
    url: "https://tatton-projects.co.uk",
    tagline: "Premium construction and renovation in Cheshire",
    description:
      "Tatton Projects is a Cheshire-based building contractor specialising in house extensions, full renovations, new builds, loft conversions and commercial fit-outs. Known for high-quality craftsmanship and transparent pricing. Serves homeowners and businesses across Cheshire, Greater Manchester and the North West.",
    niche: "Building contractor / House extensions / Renovations / Cheshire / North West",
    audience:
      "Homeowners and businesses in Cheshire and Greater Manchester needing extensions, renovations or new builds",
    location: "Cheshire, North West England",
    competitors: ["Local Cheshire builders", "National renovation firms like Resi", "TrustATrader contractors"],
    accent: "#2563eb", // blue
    emoji: "🏗️",
  },
];

export function getBusiness(slug: string): Business | undefined {
  return BUSINESSES.find(b => b.slug === slug);
}
