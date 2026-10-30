// Instrument search that behaves like people type: nicknames ("google",
// "facebook", "footsie"), brands ("iphone", "primark"), spacing and punctuation
// ("rolls royce", "m&s", "sp500"), typos ("nvidea", "appel") and half-typed
// words. Results are ranked by how well they match, then by company size, so
// "gold" finds the gold fund before Goldman Sachs.
//
// Pure and synchronous — it runs on every keystroke over ~170 instruments.

import type { Instrument } from "./instruments";
import { THEMES } from "./universe";

// Other names people use. Matched as phrases and as words, alongside the
// instrument's own name and symbol.
const ALIASES: Record<string, string[]> = {
  // US tech and media
  AAPL: ["iphone", "mac", "ipad"],
  NVDA: ["geforce"],
  TSLA: ["tesla motors", "elon musk"],
  MSFT: ["windows", "xbox", "azure", "linkedin"],
  AMZN: ["aws", "amazon web services", "prime"],
  META: ["facebook", "fb", "instagram", "whatsapp", "threads"],
  GOOGL: ["google", "youtube", "android", "waymo", "goog"],
  AMD: ["advanced micro devices", "radeon"],
  AVGO: ["vmware"],
  CRM: ["slack"],
  ADBE: ["photoshop", "acrobat"],
  CSCO: ["cisco"],
  MU: ["micron"],
  NOW: ["service now"],
  INTU: ["turbotax", "quickbooks", "credit karma"],
  TXN: ["ti"],
  PANW: ["palo alto"],
  UBER: ["uber eats"],
  NFLX: ["netflix"],
  T: ["att", "at and t"],
  TMUS: ["tmobile", "t mobile"],
  CMCSA: ["sky", "nbc", "universal"],
  DIS: ["walt disney", "disney plus", "marvel", "pixar"],
  // Consumer
  HD: ["the home depot"],
  MCD: ["maccies", "mcdonalds"],
  NKE: ["nike"],
  BKNG: ["booking com", "priceline"],
  F: ["ford"],
  GM: ["chevrolet", "cadillac"],
  WMT: ["wal mart"],
  PG: ["p and g", "procter gamble", "gillette", "pampers"],
  KO: ["coke", "coca cola"],
  PEP: ["pepsi", "walkers"],
  PM: ["marlboro"],
  MDLZ: ["cadbury", "oreo"],
  // Healthcare
  LLY: ["lilly", "mounjaro", "zepbound"],
  UNH: ["united health"],
  JNJ: ["j and j", "j j"],
  ABBV: ["humira"],
  MRK: ["merck"],
  NVO: ["novo", "ozempic", "wegovy"],
  ISRG: ["da vinci"],
  TMO: ["thermo"],
  // Financials
  JPM: ["jp morgan", "chase"],
  BAC: ["bofa", "boa"],
  GS: ["goldman"],
  AXP: ["amex"],
  BLK: ["black rock"],
  PYPL: ["pay pal", "venmo"],
  HOOD: ["robinhood"],
  SCHW: ["schwab"],
  V: ["visa"],
  MA: ["mastercard", "master card"],
  // Energy, industrials, materials, utilities, property
  XOM: ["exxon", "exxonmobil", "esso"],
  CVX: ["chevron", "texaco"],
  COP: ["conoco"],
  SLB: ["schlumberger"],
  OXY: ["occidental"],
  BA: ["boeing"],
  GE: ["general electric"],
  LMT: ["lockheed"],
  RTX: ["raytheon", "pratt and whitney"],
  DE: ["john deere", "deere"],
  UPS: ["ups"],
  FCX: ["freeport"],
  NEM: ["gold miner", "newmont mining"],
  NEE: ["nextera", "florida power"],
  O: ["realty income"],
  // UK
  LLOY: ["lloyds bank", "lloyds tsb", "halifax", "scottish widows"],
  BP: ["british petroleum"],
  SHEL: ["royal dutch shell"],
  AZN: ["astra", "astra zeneca"],
  HSBA: ["hsbc", "hsbc bank", "midland bank"],
  VOD: ["vodafone"],
  RR: ["rolls royce", "rolls", "rolls royce holdings"],
  BARC: ["barclays bank", "barclaycard"],
  TSCO: ["tesco"],
  GSK: ["glaxo", "glaxosmithkline", "glaxo smith kline"],
  ULVR: ["dove", "persil"],
  DGE: ["guinness", "johnnie walker", "smirnoff"],
  BATS: ["bat", "british american", "lucky strike"],
  IMB: ["imperial tobacco"],
  RKT: ["reckitt benckiser", "dettol", "durex"],
  HLN: ["sensodyne"],
  SBRY: ["sainsbury", "sainsburys", "argos"],
  ABF: ["primark", "twinings"],
  REL: ["reed elsevier", "lexisnexis"],
  CPG: ["compass"],
  IAG: ["british airways", "aer lingus", "iberia"],
  MKS: ["m and s", "marks and spencer", "marks and sparks", "marks spencer"],
  JD: ["jd sports"],
  RIO: ["rio tinto"],
  NG: ["national grid"],
  SSE: ["scottish and southern"],
  LSEG: ["london stock exchange", "refinitiv"],
  LGEN: ["l and g", "legal and general", "legal general"],
  NWG: ["natwest", "nat west", "rbs", "royal bank of scotland"],
  STAN: ["stanchart", "standard chartered"],
  III: ["3i", "three i"],
  SGE: ["sage"],
  OCDO: ["ocado"],
  PLUS: ["plus 500", "plus500"],
  RMV: ["right move"],
  NXT: ["next plc"],
  PSN: ["persimmon homes"],
  EZJ: ["easy jet"],
  CNA: ["british gas"],
  KGF: ["b and q", "b q", "screwfix"],
  AUTO: ["autotrader", "auto trader"],
  GAW: ["warhammer", "games workshop"],
  ADM: ["admiral insurance"],
  // Funds
  VUSA: ["s and p 500", "sp500", "sp 500", "snp 500", "s and p", "us index", "us tracker", "america fund"],
  VWRL: ["all world", "world tracker", "global tracker", "global index", "world index"],
  ISF: ["ftse 100", "ftse", "footsie", "uk index", "uk tracker"],
  EQQQ: ["nasdaq 100", "nasdaq", "qqq", "tech index"],
  VFEM: ["emerging markets"],
  IGLT: ["gilts", "gilt", "uk government bonds"],
  AGBP: ["global bonds", "bond fund", "aggregate bonds"],
  SGLN: ["gold", "gold etf", "physical gold", "gold fund"],
  // Crypto and crypto-adjacent
  BTC: ["bitcoin", "xbt"],
  ETH: ["ether", "ethereum"],
  SOL: ["solana"],
  XRP: ["ripple"],
  DOGE: ["doge", "dogecoin"],
  MSTR: ["microstrategy", "strategy"],
  // International
  TSM: ["tsmc", "taiwan semi", "taiwan semiconductor"],
  ASML: ["asml holding"],
  BABA: ["alibaba", "taobao"],
  GME: ["gamestop", "game stop"],
};

// Words for whole groups ("ai", "banks", "pharma"), on top of each theme's and
// sector's own label and the first word of each industry.
const GROUP_WORDS: Record<string, string[]> = {
  ai: ["ai", "artificial intelligence"],
  chips: ["chips", "chip stocks", "chipmakers", "semis", "semiconductor"],
  cloud: ["cloud", "software", "saas"],
  cyber: ["cyber", "cyber security", "security"],
  ev: ["ev", "evs", "electric cars"],
  obesity: ["weight loss", "glp1", "glp 1", "obesity"],
  defence: ["defence", "defense", "aerospace"],
  energy_transition: ["clean energy", "renewables", "green energy", "nuclear"],
  oil: ["oil", "oil and gas", "oil majors"],
  crypto: ["crypto", "cryptocurrency", "cryptocurrencies"],
  fintech: ["fintech", "payments"],
  banks: ["banks", "banking"],
  brands: ["brands", "consumer brands"],
  income: ["dividends", "dividend", "income", "high yield", "dividend stocks"],
  streaming: ["streaming", "media"],
  uk_retail: ["uk retail", "high street", "retailers"],
  miners: ["miners", "mining", "metals"],
  travel: ["travel", "holidays"],
  Healthcare: ["healthcare", "health", "pharma", "pharmaceuticals", "drugs", "drugmakers", "medical", "biotech"],
  Technology: ["tech", "technology", "tech stocks"],
  Financials: ["financials", "finance", "financial"],
  Energy: ["energy"],
  Utilities: ["utilities", "utility"],
  "Real Estate": ["property", "real estate", "reits", "reit"],
  Materials: ["materials"],
  Industrials: ["industrials", "industrial"],
  "Consumer Staples": ["staples", "consumer staples"],
  "Consumer Discretionary": ["consumer discretionary", "retail", "shopping"],
  "Communication Services": ["communication services", "telecoms", "telecom", "media"],
  "Residential Construction": ["housebuilders", "homebuilders", "house builders", "housing"],
  "Insurance": ["insurers", "insurance"],
  etf: ["etf", "etfs", "funds", "trackers", "index funds"],
  uk: ["uk", "uk shares", "british", "ftse shares", "london"],
  us: ["us", "us shares", "american", "usa", "wall street"],
  bonds: ["bonds", "bond", "fixed income"],
};

// First words of industry names that don't make sense on their own.
const WEAK_INDUSTRY = new Set(["other", "specialty", "consumer", "capital", "home", "information", "financial", "drug", "residential", "internet", "entertainment", "communication", "utilities", "diversified"]);

// Generic words that shouldn't stop a match ("tesla shares", "bp plc").
const FILLER = new Set(["the", "plc", "inc", "ltd", "limited", "corp", "corporation", "co", "company", "share", "shares", "stock", "stocks", "price", "prices", "quote", "ticker", "holdings", "group", "of", "and", "ord", "ordinary"]);

// Words that describe the kind of instrument, matched against type and region.
const KIND_WORDS: Record<Instrument["type"], string[]> = {
  stock: ["share", "stock", "equity", "company"],
  etf: ["etf", "fund", "tracker", "index", "etc", "ucits"],
  crypto: ["crypto", "coin", "cryptocurrency", "token"],
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const compact = (s: string) => s.replace(/ /g, "");

/** Optimal-string-alignment distance (Levenshtein plus adjacent swaps), capped. */
export function editDistance(a: string, b: string, cap = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > cap) return cap + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

// How many typos a word of this length may carry.
const allowance = (n: number) => (n >= 8 ? 2 : n >= 4 ? 1 : 0);

/** How well one typed word matches one word of the instrument, 0–1. */
function wordScore(q: string, w: string): number {
  if (q === w) return 1;
  if (w.startsWith(q)) return q.length >= 2 ? 0.75 + 0.2 * (q.length / w.length) : 0.5;
  const tol = allowance(q.length);
  if (!tol) return 0;
  if (editDistance(q, w, tol) <= tol) return 0.7;
  // A typo in a half-typed word: compare against the same-length start.
  if (w.length > q.length && editDistance(q, w.slice(0, q.length), 1) <= 1) return 0.55;
  return 0;
}

interface Doc {
  i: Instrument;
  sym: string;
  phrases: string[]; // name and aliases, normalised
  words: string[]; // every word of the above, plus the symbol
  context: string[]; // sector, industry, themes, kind and region words
  size: number; // ranking prior, 0–40
}

function sizeUsd(i: Instrument): number {
  if (i.type === "crypto") return ({ BTC: 1.3e12, ETH: 4e11, SOL: 8e10, XRP: 1.2e11, DOGE: 2.5e10 } as Record<string, number>)[i.symbol] ?? 1e10;
  if (i.type === "etf") return ({ VUSA: 9e10, VWRL: 8e10, ISF: 7e10, EQQQ: 6e10, SGLN: 5e10 } as Record<string, number>)[i.symbol] ?? 3e10; // the trackers people look for most
  const px = i.currency === "GBX" ? (i.base / 100) * 1.3 : i.currency === "GBP" ? i.base * 1.3 : i.base;
  return (i.sharesM ?? 100) * 1e6 * px;
}

const themesBySymbol = new Map<string, string[]>();
for (const t of Object.values(THEMES)) for (const s of t.symbols) themesBySymbol.set(s, [...(themesBySymbol.get(s) ?? []), t.label]);

let DOCS: Doc[] | null = null;
let DOCS_FOR: Instrument[] | null = null;
let GROUPS = new Map<string, Map<string, number>>(); // keyword -> member symbol -> score

const singular = (w: string) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

// Sector, industry and type members score 700; theme members slightly less, so
// "crypto" lists the coins before the crypto-linked shares.
function addGroup(word: string, symbol: string, score = 700) {
  const k = singular(normalize(word));
  if (!k) return;
  let m = GROUPS.get(k);
  if (!m) GROUPS.set(k, (m = new Map()));
  m.set(symbol, Math.max(m.get(symbol) ?? 0, score));
}

function buildGroups(list: Instrument[]) {
  GROUPS = new Map();
  for (const [id, t] of Object.entries(THEMES)) for (const sym of t.symbols) for (const w of [t.label, ...(GROUP_WORDS[id] ?? [])]) addGroup(w, sym, 690);
  for (const i of list) {
    for (const w of [i.sector, ...(GROUP_WORDS[i.sector] ?? [])]) addGroup(w, i.symbol);
    if (i.industry) {
      const ind = normalize(i.industry);
      addGroup(ind, i.symbol);
      const first = ind.split(" ")[0];
      if (!WEAK_INDUSTRY.has(first)) addGroup(first, i.symbol);
      for (const [k, words] of Object.entries(GROUP_WORDS)) if (i.industry.startsWith(k)) for (const w of words) addGroup(w, i.symbol);
    }
    if (i.type === "etf") for (const w of GROUP_WORDS.etf) addGroup(w, i.symbol);
    if (i.type === "stock" && i.exchange === "LSE") for (const w of GROUP_WORDS.uk) addGroup(w, i.symbol);
    if (i.type === "stock" && i.region === "US" && !i.country) for (const w of GROUP_WORDS.us) addGroup(w, i.symbol);
    if (i.assetClass === "Bond") for (const w of GROUP_WORDS.bonds) addGroup(w, i.symbol);
  }
}

function docs(list: Instrument[]): Doc[] {
  if (DOCS && DOCS_FOR === list) return DOCS;
  DOCS_FOR = list;
  buildGroups(list);
  DOCS = list.map((i) => {
    const phrases = [normalize(i.name), ...(ALIASES[i.symbol] ?? []).map(normalize)];
    const words = new Set<string>([i.symbol.toLowerCase()]);
    for (const p of phrases) for (const w of p.split(" ")) if (w && !FILLER.has(w)) words.add(w);
    const context = new Set<string>();
    for (const s of [i.sector, i.industry ?? "", ...(themesBySymbol.get(i.symbol) ?? []), i.region, i.exchange === "LSE" ? "uk london british" : "", i.region === "US" ? "american usa" : ""])
      for (const w of normalize(s).split(" ")) if (w && !FILLER.has(w)) context.add(w);
    for (const w of KIND_WORDS[i.type]) context.add(w);
    return { i, sym: i.symbol.toLowerCase(), phrases, words: [...words], context: [...context], size: Math.max(0, Math.min(40, (Math.log10(sizeUsd(i)) - 9) * 12)) };
  });
  return DOCS;
}

export type MatchKind = "symbol" | "name" | "typo" | "related";

export interface SearchHit {
  i: Instrument;
  score: number;
  kind: MatchKind;
}

function scoreDoc(d: Doc, q: string, qc: string, qWords: string[]): { score: number; kind: MatchKind } {
  let best = 0;
  let kind: MatchKind = "name";
  const take = (s: number, k: MatchKind) => {
    if (s > best) {
      best = s;
      kind = k;
    }
  };

  // Ticker: exact beats everything; a typed prefix ranks by how much is left.
  if (qc === d.sym) take(1000, "symbol");
  else if (d.sym.startsWith(qc)) take(760 - 15 * (d.sym.length - qc.length), "symbol");

  // Whole phrase against the name and each alias.
  for (const p of d.phrases) {
    const pc = compact(p);
    if (p === q || pc === qc) take(950, "name");
    else if (p.startsWith(q + " ") || (qc.length >= 3 && pc.startsWith(qc))) take(860 - Math.min(40, pc.length - qc.length), "name");
    else if (q.length >= 3 && (` ${p} `.includes(` ${q} `) || ` ${p}`.includes(` ${q}`))) take(680, "name");
    else if (qc.length >= 4 && pc.includes(qc)) take(600, "name");
  }

  // Word by word: each meaningful typed word must land somewhere.
  const meaningful = qWords.filter((w) => !FILLER.has(w));
  const need = meaningful.length ? meaningful : qWords;
  if (need.length) {
    let total = 0;
    let typo = false;
    let primary = 0;
    for (const w of need) {
      let s = 0;
      for (const dw of d.words) s = Math.max(s, wordScore(w, dw));
      let c = 0;
      for (const cw of d.context) c = Math.max(c, wordScore(w, cw) * 0.6);
      if (s === 0 && c === 0) return { score: best, kind };
      if (s >= c) {
        primary++;
        if (s < 0.75) typo = true;
        total += s;
      } else total += c;
    }
    const mean = total / need.length;
    if (primary === need.length) take(300 + 400 * mean, typo ? "typo" : "name");
    else if (primary > 0) take(250 + 350 * mean, "name");
    else take(100 + 200 * mean, "related");
  }
  return { score: best, kind };
}

/** Ranked matches for a search box. Empty input returns nothing. */
export function search(list: Instrument[], query: string, limit = 8): SearchHit[] {
  const q = normalize(query);
  if (!q) return [];
  const qc = compact(q);
  const qWords = q.split(" ").filter(Boolean);
  const hits: SearchHit[] = [];
  const all = docs(list);
  // A whole-group word ("banks", "ai", "pharma") brings in every member.
  const group = GROUPS.get(singular(q));
  for (const d of all) {
    let { score, kind } = scoreDoc(d, q, qc, qWords);
    const g = group?.get(d.i.symbol) ?? 0;
    if (g > score) {
      score = g;
      kind = "related";
    }
    if (score > 0) hits.push({ i: d.i, score: score + d.size, kind });
  }
  hits.sort((a, b) => b.score - a.score || a.i.symbol.localeCompare(b.i.symbol));
  return hits.slice(0, limit);
}

// Well-known names Shortlist doesn't carry yet, so an empty search can say so
// plainly rather than leave people guessing whether they mistyped.
const NOT_COVERED: { name: string; listing: string; words: string[] }[] = [
  { name: "BAE Systems", listing: "LSE: BA.", words: ["bae", "bae systems"] },
  { name: "BT Group", listing: "LSE: BT.A", words: ["bt", "bt group", "british telecom"] },
  { name: "Berkshire Hathaway", listing: "NYSE: BRK.B", words: ["berkshire", "berkshire hathaway", "warren buffett", "brk"] },
  { name: "Smith & Nephew", listing: "LSE: SN.", words: ["smith and nephew", "smith nephew"] },
  { name: "Taylor Wimpey", listing: "LSE: TW.", words: ["taylor wimpey", "wimpey"] },
  { name: "United Utilities", listing: "LSE: UU.", words: ["united utilities"] },
  { name: "Ryanair", listing: "Euronext Dublin / NASDAQ: RYAAY", words: ["ryanair"] },
  { name: "Samsung Electronics", listing: "Korea Exchange", words: ["samsung"] },
  { name: "Toyota", listing: "Tokyo / NYSE: TM", words: ["toyota"] },
  { name: "Nestlé", listing: "SIX Swiss Exchange", words: ["nestle"] },
  { name: "LVMH", listing: "Euronext Paris", words: ["lvmh", "louis vuitton"] },
  { name: "Tencent", listing: "Hong Kong", words: ["tencent"] },
  { name: "Ferrari", listing: "NYSE: RACE", words: ["ferrari"] },
];

/** A well-known company we don't list, if the query names one. */
export function notCovered(query: string): { name: string; listing: string } | null {
  const q = normalize(query);
  if (q.length < 2) return null;
  for (const n of NOT_COVERED) if (n.words.some((w) => w === q || (q.length >= 4 && w.startsWith(q)))) return { name: n.name, listing: n.listing };
  return null;
}
