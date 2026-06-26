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
    tagline: "Quiet Spaces. Better Work. Acoustic office pods for focus, calls and meetings.",
    description:
      "SiloPod designs and sells acoustic office pods for open-plan workplaces. Five sizes: SiloPod S (private phone booth, 1 person, from £3,995), SiloPod M (focus pod, 1 person, from £4,495), SiloPod L (2-person meeting pod, from £4,795), SiloPod XL (1-4 people collaboration pod, from £5,195), SiloPod XXL (1-6 person meeting room, from £5,995). All include acoustic insulation, ventilation, LED lighting, USB-A/USB-C power, toughened glass, premium finishes and a 5-year warranty. No planning permission needed, installed in hours not weeks, moveable as office layouts change. Nationwide delivery and installation across the UK. Based in Altrincham, Cheshire. Trusted by corporate offices, technology companies, educational facilities, healthcare providers, financial services and local authorities.",
    niche: "Acoustic office pods / Soundproof pods / Office phone booths / Meeting pods / Quiet workspace solutions / Open plan office noise",
    audience:
      "Facilities managers, office managers, HR directors and business owners across the UK who need to solve open-plan office noise — for focus work, private calls, Zoom meetings, HR conversations and confidential discussions. Also procurement teams buying 5, 10 or 60+ pods for multi-site rollouts.",
    location: "Altrincham, Cheshire — nationwide delivery and installation across the UK",
    competitors: ["Framery", "Hana", "ROOM", "Zenbooth", "SnapCab", "BuzziSpace", "Kvadrat"],
    accent: "#d97706", // amber/gold matching their branding
    emoji: "🔇",
  },
  {
    slug: "primo-vending",
    name: "Primo Vending",
    url: "https://www.primo-vending.com",
    tagline: "Free vending machines for your workplace — fully managed, zero cost.",
    description:
      "Primo Vending supplies and fully manages vending machines for businesses across the North West at zero cost to the business. Services include free installation and delivery, regular restocking, cashless card and mobile payment systems, 24/7 local support, and modern energy-efficient machines stocked with premium snacks and drinks including healthy options. Based in Trafford Park, Manchester. Revenue model: profit-share on product sales — the business pays nothing upfront or ongoing.",
    niche: "Vending machines / Workplace refreshments / Managed vending / Free vending / North West Manchester",
    audience:
      "Business owners, office managers, facilities managers and HR teams across Greater Manchester and the North West looking to provide free or paid refreshments for employees with zero hassle and zero cost",
    location: "Trafford Park, Manchester — serving Greater Manchester and the North West",
    competitors: ["Selecta", "Compass Group", "Autobar", "Crown Vending", "local independent vending operators"],
    accent: "#dc2626", // red
    emoji: "🥤",
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
