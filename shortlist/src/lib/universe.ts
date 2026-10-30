// The wider stock universe behind the screener, heatmap and groups pages.
//
// instruments.ts holds the original hand-tuned list (the short-scanner names,
// FTSE favourites, ETFs and crypto). This file adds ~120 more large caps across
// every sector, so the market-wide tools have a market to work with, and gives
// every share the reference data a Finviz-style screener needs: industry, index
// membership and shares outstanding (for market cap).
//
// Prices here only seed the simulator (see market.ts). With a market-data key
// configured, live quotes replace them.

import type { Currency, Instrument, Region } from "./instruments";

export type IndexCode = "SPX" | "NDX" | "DJI" | "UKX" | "MCX";

export const INDEX_LABEL: Record<IndexCode, string> = {
  SPX: "S&P 500",
  NDX: "Nasdaq-100",
  DJI: "Dow Jones",
  UKX: "FTSE 100",
  MCX: "FTSE 250",
};

// Typical daily volatility by sector, before a per-name multiplier.
const SECTOR_VOL: Record<string, number> = {
  Technology: 0.021,
  "Communication Services": 0.018,
  "Consumer Discretionary": 0.019,
  "Consumer Staples": 0.01,
  Healthcare: 0.014,
  Financials: 0.015,
  Energy: 0.017,
  Industrials: 0.015,
  Materials: 0.018,
  Utilities: 0.011,
  "Real Estate": 0.014,
};

export interface Profile {
  industry: string;
  sharesM: number; // shares outstanding, millions
  indices: IndexCode[];
  exchange?: Instrument["exchange"];
  country?: string;
}

// Reference data for the original stocks in instruments.ts.
export const PROFILES: Record<string, Profile> = {
  AAPL: { industry: "Consumer Electronics", sharesM: 14900, indices: ["SPX", "NDX", "DJI"] },
  NVDA: { industry: "Semiconductors", sharesM: 24300, indices: ["SPX", "NDX", "DJI"] },
  TSLA: { industry: "Auto Manufacturers", sharesM: 3220, indices: ["SPX", "NDX"] },
  MSFT: { industry: "Software - Infrastructure", sharesM: 7430, indices: ["SPX", "NDX", "DJI"] },
  AMZN: { industry: "Internet Retail", sharesM: 10700, indices: ["SPX", "NDX", "DJI"] },
  META: { industry: "Internet Content & Information", sharesM: 2520, indices: ["SPX", "NDX"] },
  GOOGL: { industry: "Internet Content & Information", sharesM: 12100, indices: ["SPX", "NDX"] },
  AMD: { industry: "Semiconductors", sharesM: 1620, indices: ["SPX", "NDX"] },
  COIN: { industry: "Financial Data & Stock Exchanges", sharesM: 255, indices: ["SPX", "NDX"], exchange: "NASDAQ" },
  PLTR: { industry: "Software - Infrastructure", sharesM: 2370, indices: ["SPX", "NDX"], exchange: "NASDAQ" },
  SHOP: { industry: "Software - Application", sharesM: 1300, indices: ["NDX"], exchange: "NASDAQ", country: "Canada" },
  DIS: { industry: "Entertainment", sharesM: 1800, indices: ["SPX", "DJI"] },
  LLOY: { industry: "Banks - Regional", sharesM: 59000, indices: ["UKX"] },
  BP: { industry: "Oil & Gas Integrated", sharesM: 15700, indices: ["UKX"] },
  SHEL: { industry: "Oil & Gas Integrated", sharesM: 5900, indices: ["UKX"] },
  AZN: { industry: "Drug Manufacturers - General", sharesM: 1550, indices: ["UKX"] },
  HSBA: { industry: "Banks - Diversified", sharesM: 17400, indices: ["UKX"] },
  VOD: { industry: "Telecom Services", sharesM: 24500, indices: ["UKX"] },
  RR: { industry: "Aerospace & Defense", sharesM: 8400, indices: ["UKX"] },
  BARC: { industry: "Banks - Diversified", sharesM: 14200, indices: ["UKX"] },
  TSCO: { industry: "Grocery Stores", sharesM: 6600, indices: ["UKX"] },
  GSK: { industry: "Drug Manufacturers - General", sharesM: 4050, indices: ["UKX"] },
};

// symbol, name, exchange, sector, industry, price, shares (M), yield %, vol multiplier, indices, description, region?, country?
type Row = [string, string, Instrument["exchange"], string, string, number, number, number, number, IndexCode[], string, Region?, string?];

const S = ["SPX"] as IndexCode[];
const SN = ["SPX", "NDX"] as IndexCode[];
const SD = ["SPX", "DJI"] as IndexCode[];
const SND = ["SPX", "NDX", "DJI"] as IndexCode[];
const UKX = ["UKX"] as IndexCode[];
const MCX = ["MCX"] as IndexCode[];

const ROWS: Row[] = [
  // --- US: Technology ----------------------------------------------------------
  ["AVGO", "Broadcom", "NASDAQ", "Technology", "Semiconductors", 330, 4700, 0.8, 1.3, SN, "Custom AI chips, networking silicon and VMware software."],
  ["ORCL", "Oracle", "NYSE", "Technology", "Software - Infrastructure", 220, 2800, 0.9, 1.4, S, "Databases, enterprise apps and a fast-growing AI cloud."],
  ["CRM", "Salesforce", "NYSE", "Technology", "Software - Application", 260, 960, 0.6, 1.0, SD, "The leading CRM platform, now pushing AI agents."],
  ["ADBE", "Adobe", "NASDAQ", "Technology", "Software - Application", 380, 425, 0, 1.0, SN, "Photoshop, Acrobat and the Creative Cloud suite."],
  ["INTC", "Intel", "NASDAQ", "Technology", "Semiconductors", 22, 4370, 0, 1.5, SN, "PC and server chips, rebuilding its foundry business."],
  ["CSCO", "Cisco Systems", "NASDAQ", "Technology", "Communication Equipment", 65, 3970, 2.5, 0.7, SND, "Networking gear, security and Splunk software."],
  ["QCOM", "Qualcomm", "NASDAQ", "Technology", "Semiconductors", 160, 1100, 2.1, 1.1, SN, "Smartphone processors and modems, moving into PCs and cars."],
  ["TXN", "Texas Instruments", "NASDAQ", "Technology", "Semiconductors", 190, 910, 2.8, 0.9, SN, "Analogue and embedded chips for industry and cars."],
  ["IBM", "IBM", "NYSE", "Technology", "Information Technology Services", 250, 930, 2.7, 0.8, SD, "Hybrid cloud, consulting, mainframes and quantum research."],
  ["MU", "Micron Technology", "NASDAQ", "Technology", "Semiconductors", 110, 1120, 0.4, 1.6, SN, "Memory chips, including high-bandwidth memory for AI."],
  ["NOW", "ServiceNow", "NYSE", "Technology", "Software - Application", 950, 207, 0, 1.1, S, "Workflow software that runs IT and HR at big companies."],
  ["INTU", "Intuit", "NASDAQ", "Technology", "Software - Application", 650, 280, 0.6, 1.0, SN, "TurboTax, QuickBooks, Credit Karma and Mailchimp."],
  ["AMAT", "Applied Materials", "NASDAQ", "Technology", "Semiconductor Equipment & Materials", 170, 810, 1.0, 1.3, SN, "The machines that make chips."],
  ["ANET", "Arista Networks", "NYSE", "Technology", "Computer Hardware", 100, 1260, 0, 1.5, S, "High-speed switches for cloud and AI data centres."],
  ["SNOW", "Snowflake", "NYSE", "Technology", "Software - Application", 200, 335, 0, 1.7, [], "Cloud data warehouse sold on a pay-as-you-go basis."],
  ["CRWD", "CrowdStrike", "NASDAQ", "Technology", "Software - Infrastructure", 430, 248, 0, 1.4, SN, "Cloud-native endpoint security."],
  ["PANW", "Palo Alto Networks", "NASDAQ", "Technology", "Software - Infrastructure", 190, 660, 0, 1.1, SN, "Firewalls and a broad cyber-security platform."],
  ["UBER", "Uber Technologies", "NYSE", "Technology", "Software - Application", 85, 2100, 0, 1.3, S, "Ride-hailing and food delivery in 70 countries."],
  ["ARM", "Arm Holdings", "NASDAQ", "Technology", "Semiconductors", 140, 1060, 0, 2.0, ["NDX"], "Cambridge-designed chip architectures inside nearly every phone.", "UK"],
  ["DELL", "Dell Technologies", "NYSE", "Technology", "Computer Hardware", 120, 690, 1.5, 1.4, S, "PCs, servers and storage, with a booming AI server line."],

  // --- US: Communication Services ---------------------------------------------
  ["NFLX", "Netflix", "NASDAQ", "Communication Services", "Entertainment", 110, 4250, 0, 1.2, SN, "The largest paid streaming service, now with ads and live sport."],
  ["T", "AT&T", "NYSE", "Communication Services", "Telecom Services", 27, 7200, 4.1, 0.6, S, "US wireless and fibre broadband."],
  ["VZ", "Verizon", "NYSE", "Communication Services", "Telecom Services", 42, 4210, 6.4, 0.6, SD, "America's biggest wireless carrier by revenue; a high-yield staple."],
  ["CMCSA", "Comcast", "NASDAQ", "Communication Services", "Telecom Services", 35, 3800, 3.7, 0.8, SN, "Cable broadband, NBCUniversal and Sky in the UK."],
  ["SPOT", "Spotify", "NYSE", "Communication Services", "Internet Content & Information", 650, 205, 0, 1.4, [], "The world's largest audio streaming platform.", "Europe"],
  ["TMUS", "T-Mobile US", "NASDAQ", "Communication Services", "Telecom Services", 240, 1140, 1.5, 0.7, SN, "The fastest-growing US wireless network."],

  // --- US: Consumer Discretionary ----------------------------------------------
  ["HD", "Home Depot", "NYSE", "Consumer Discretionary", "Home Improvement Retail", 380, 995, 2.4, 0.8, SD, "America's largest home-improvement retailer."],
  ["MCD", "McDonald's", "NYSE", "Consumer Discretionary", "Restaurants", 300, 715, 2.4, 0.6, SD, "The world's biggest restaurant chain, mostly franchised."],
  ["NKE", "Nike", "NYSE", "Consumer Discretionary", "Footwear & Accessories", 70, 1480, 2.3, 1.1, SD, "Sportswear giant in the middle of a turnaround."],
  ["SBUX", "Starbucks", "NASDAQ", "Consumer Discretionary", "Restaurants", 90, 1140, 2.7, 1.0, SN, "Coffee shops in 80 markets; a turnaround story."],
  ["LOW", "Lowe's", "NYSE", "Consumer Discretionary", "Home Improvement Retail", 240, 560, 2.0, 0.8, S, "Home improvement for DIYers and trade customers."],
  ["BKNG", "Booking Holdings", "NASDAQ", "Consumer Discretionary", "Travel Services", 5200, 33, 0.7, 0.9, SN, "Booking.com, Priceline and Kayak."],
  ["ABNB", "Airbnb", "NASDAQ", "Consumer Discretionary", "Travel Services", 130, 620, 0, 1.2, SN, "Short-stay rental marketplace."],
  ["F", "Ford Motor", "NYSE", "Consumer Discretionary", "Auto Manufacturers", 11, 3980, 5.5, 1.1, S, "Trucks, SUVs and the Ford Pro commercial business."],
  ["GM", "General Motors", "NYSE", "Consumer Discretionary", "Auto Manufacturers", 55, 960, 1.0, 1.1, S, "Chevrolet, GMC, Cadillac and Buick."],
  ["CMG", "Chipotle", "NYSE", "Consumer Discretionary", "Restaurants", 45, 1340, 0, 1.1, S, "Fast-casual Mexican food chain."],

  // --- US: Consumer Staples ----------------------------------------------------
  ["WMT", "Walmart", "NASDAQ", "Consumer Staples", "Discount Stores", 100, 7980, 0.9, 0.8, SND, "The world's largest retailer, with a growing ads business."],
  ["COST", "Costco", "NASDAQ", "Consumer Staples", "Discount Stores", 920, 443, 0.5, 0.8, SN, "Membership warehouse clubs."],
  ["PG", "Procter & Gamble", "NYSE", "Consumer Staples", "Household & Personal Products", 155, 2340, 2.7, 0.6, SD, "Pampers, Gillette, Ariel and Head & Shoulders."],
  ["KO", "Coca-Cola", "NYSE", "Consumer Staples", "Beverages - Non-Alcoholic", 70, 4300, 2.9, 0.5, SD, "The world's biggest drinks brand; 60+ years of dividend rises."],
  ["PEP", "PepsiCo", "NASDAQ", "Consumer Staples", "Beverages - Non-Alcoholic", 145, 1370, 3.8, 0.6, SN, "Pepsi, Walkers, Doritos and Quaker."],
  ["PM", "Philip Morris", "NYSE", "Consumer Staples", "Tobacco", 160, 1555, 3.4, 0.8, S, "Marlboro outside the US and the IQOS heated-tobacco device."],
  ["MDLZ", "Mondelez", "NASDAQ", "Consumer Staples", "Confectioners", 60, 1300, 3.1, 0.7, SN, "Cadbury, Oreo and Toblerone."],

  // --- US: Healthcare ----------------------------------------------------------
  ["LLY", "Eli Lilly", "NYSE", "Healthcare", "Drug Manufacturers - General", 800, 950, 0.7, 1.2, S, "Diabetes and obesity drugs Mounjaro and Zepbound."],
  ["UNH", "UnitedHealth", "NYSE", "Healthcare", "Healthcare Plans", 310, 905, 2.8, 1.2, SD, "America's largest health insurer and Optum services."],
  ["JNJ", "Johnson & Johnson", "NYSE", "Healthcare", "Drug Manufacturers - General", 180, 2410, 2.9, 0.6, SD, "Pharmaceuticals and medical devices."],
  ["ABBV", "AbbVie", "NYSE", "Healthcare", "Drug Manufacturers - General", 210, 1770, 3.1, 0.8, S, "Immunology drugs Skyrizi and Rinvoq."],
  ["MRK", "Merck & Co", "NYSE", "Healthcare", "Drug Manufacturers - General", 85, 2500, 3.8, 0.8, SD, "Cancer drug Keytruda and vaccines."],
  ["PFE", "Pfizer", "NYSE", "Healthcare", "Drug Manufacturers - General", 25, 5690, 6.8, 0.8, S, "Big pharma rebuilding after the Covid boom; a high yield."],
  ["TMO", "Thermo Fisher", "NYSE", "Healthcare", "Diagnostics & Research", 480, 378, 0.3, 0.9, S, "Lab equipment, reagents and research services."],
  ["ISRG", "Intuitive Surgical", "NASDAQ", "Healthcare", "Medical Instruments & Supplies", 520, 358, 0, 1.0, SN, "The da Vinci surgical robot."],
  ["AMGN", "Amgen", "NASDAQ", "Healthcare", "Drug Manufacturers - General", 290, 538, 3.3, 0.8, SND, "Biotech pioneer with bone, heart and obesity drugs."],
  ["NVO", "Novo Nordisk", "NYSE", "Healthcare", "Drug Manufacturers - General", 50, 4440, 3.0, 1.4, [], "Danish maker of Ozempic and Wegovy.", "Europe"],
  ["MRNA", "Moderna", "NASDAQ", "Healthcare", "Biotechnology", 28, 390, 0, 2.3, S, "mRNA vaccines and medicines."],
  ["VRTX", "Vertex Pharmaceuticals", "NASDAQ", "Healthcare", "Biotechnology", 450, 256, 0, 0.9, SN, "Cystic fibrosis treatments and a pain-drug pipeline."],

  // --- US: Financials ----------------------------------------------------------
  ["JPM", "JPMorgan Chase", "NYSE", "Financials", "Banks - Diversified", 290, 2750, 2.0, 0.9, SD, "America's largest bank."],
  ["BAC", "Bank of America", "NYSE", "Financials", "Banks - Diversified", 48, 7450, 2.3, 1.0, S, "Consumer banking, Merrill wealth and markets."],
  ["WFC", "Wells Fargo", "NYSE", "Financials", "Banks - Diversified", 80, 3200, 2.1, 1.0, S, "US retail and commercial bank."],
  ["GS", "Goldman Sachs", "NYSE", "Financials", "Capital Markets", 700, 307, 1.8, 1.1, SD, "Investment banking, trading and asset management."],
  ["MS", "Morgan Stanley", "NYSE", "Financials", "Capital Markets", 140, 1600, 2.7, 1.0, S, "Wealth management and investment banking."],
  ["V", "Visa", "NYSE", "Financials", "Credit Services", 340, 1930, 0.7, 0.7, SD, "The world's largest card payments network."],
  ["MA", "Mastercard", "NYSE", "Financials", "Credit Services", 560, 905, 0.5, 0.7, S, "Global card payments network."],
  ["AXP", "American Express", "NYSE", "Financials", "Credit Services", 310, 695, 1.0, 1.0, SD, "Premium cards and a closed-loop payments network."],
  ["BLK", "BlackRock", "NYSE", "Financials", "Asset Management", 1050, 155, 2.0, 0.9, S, "The world's largest asset manager and maker of iShares ETFs."],
  ["PYPL", "PayPal", "NASDAQ", "Financials", "Credit Services", 65, 970, 0.9, 1.3, SN, "Online payments, Venmo and Braintree."],
  ["HOOD", "Robinhood Markets", "NASDAQ", "Financials", "Capital Markets", 110, 885, 0, 2.6, S, "Commission-free trading app, now in the UK too."],
  ["SCHW", "Charles Schwab", "NYSE", "Financials", "Capital Markets", 95, 1810, 1.1, 1.0, S, "America's largest retail brokerage."],

  // --- US: Energy --------------------------------------------------------------
  ["XOM", "Exxon Mobil", "NYSE", "Energy", "Oil & Gas Integrated", 112, 4300, 3.6, 0.8, S, "The largest US oil major."],
  ["CVX", "Chevron", "NYSE", "Energy", "Oil & Gas Integrated", 155, 2000, 4.4, 0.8, SD, "Integrated oil and gas, now owner of Hess."],
  ["COP", "ConocoPhillips", "NYSE", "Energy", "Oil & Gas E&P", 95, 1250, 3.3, 1.0, S, "The largest independent oil and gas producer."],
  ["SLB", "SLB", "NYSE", "Energy", "Oil & Gas Equipment & Services", 36, 1350, 3.1, 1.1, S, "Oilfield services and technology."],
  ["OXY", "Occidental Petroleum", "NYSE", "Energy", "Oil & Gas E&P", 45, 985, 2.1, 1.2, S, "Permian oil producer, part-owned by Berkshire Hathaway."],

  // --- US: Industrials ---------------------------------------------------------
  ["CAT", "Caterpillar", "NYSE", "Industrials", "Farm & Heavy Construction Machinery", 450, 470, 1.3, 1.0, SD, "Diggers, mining trucks and data-centre power generators."],
  ["BA", "Boeing", "NYSE", "Industrials", "Aerospace & Defense", 210, 755, 0, 1.3, SD, "Commercial jets, defence and space."],
  ["GE", "GE Aerospace", "NYSE", "Industrials", "Aerospace & Defense", 280, 1060, 0.5, 1.0, S, "Jet engines for most of the world's airliners."],
  ["HON", "Honeywell", "NASDAQ", "Industrials", "Conglomerates", 210, 635, 2.2, 0.8, SND, "Aerospace, automation and building technology."],
  ["UPS", "United Parcel Service", "NYSE", "Industrials", "Integrated Freight & Logistics", 95, 850, 6.9, 1.0, S, "Parcel delivery; a high-yield turnaround."],
  ["LMT", "Lockheed Martin", "NYSE", "Industrials", "Aerospace & Defense", 470, 233, 2.8, 0.7, S, "F-35 fighters, missiles and space systems."],
  ["RTX", "RTX", "NYSE", "Industrials", "Aerospace & Defense", 160, 1340, 1.7, 0.8, S, "Pratt & Whitney engines, Collins and Raytheon missiles."],
  ["DE", "Deere & Co", "NYSE", "Industrials", "Farm & Heavy Construction Machinery", 480, 271, 1.3, 0.9, S, "John Deere tractors and precision agriculture."],
  ["UNP", "Union Pacific", "NYSE", "Industrials", "Railroads", 230, 595, 2.3, 0.8, S, "Freight railroad across the western US."],

  // --- US: Materials, Utilities, Real Estate ------------------------------------
  ["LIN", "Linde", "NASDAQ", "Materials", "Specialty Chemicals", 450, 470, 1.3, 0.6, SN, "Industrial gases for factories, hospitals and chipmakers."],
  ["FCX", "Freeport-McMoRan", "NYSE", "Materials", "Copper", 42, 1435, 1.4, 1.4, S, "One of the world's largest copper miners."],
  ["NEM", "Newmont", "NYSE", "Materials", "Gold", 80, 1100, 1.3, 1.3, S, "The world's largest gold miner."],
  ["NEE", "NextEra Energy", "NYSE", "Utilities", "Utilities - Regulated Electric", 75, 2060, 2.9, 1.2, S, "Florida utility and the largest wind and solar developer."],
  ["DUK", "Duke Energy", "NYSE", "Utilities", "Utilities - Regulated Electric", 120, 778, 3.5, 0.8, S, "Electric and gas utility in the Carolinas and Florida."],
  ["SO", "Southern Company", "NYSE", "Utilities", "Utilities - Regulated Electric", 90, 1100, 3.2, 0.8, S, "Utility serving the south-eastern US."],
  ["CEG", "Constellation Energy", "NASDAQ", "Utilities", "Utilities - Independent Power Producers", 330, 313, 0.5, 1.9, SN, "America's largest nuclear fleet, selling power to data centres."],
  ["PLD", "Prologis", "NYSE", "Real Estate", "REIT - Industrial", 115, 928, 3.5, 1.0, S, "Warehouses and logistics property worldwide."],
  ["AMT", "American Tower", "NYSE", "Real Estate", "REIT - Specialty", 190, 468, 3.6, 0.9, S, "Mobile-phone towers in 25 countries."],
  ["O", "Realty Income", "NYSE", "Real Estate", "REIT - Retail", 57, 900, 5.6, 0.7, S, "Monthly-dividend retail landlord."],
  ["EQIX", "Equinix", "NASDAQ", "Real Estate", "REIT - Specialty", 800, 98, 2.3, 0.9, SN, "Data centres where networks and clouds interconnect."],

  // --- UK: FTSE 100 and FTSE 250 (prices in pence) ------------------------------
  ["ULVR", "Unilever", "LSE", "Consumer Staples", "Household & Personal Products", 4500, 2500, 3.4, 0.9, UKX, "Dove, Hellmann's and Persil."],
  ["DGE", "Diageo", "LSE", "Consumer Staples", "Beverages - Wineries & Distilleries", 1800, 2220, 4.3, 1.3, UKX, "Guinness, Johnnie Walker and Smirnoff."],
  ["BATS", "British American Tobacco", "LSE", "Consumer Staples", "Tobacco", 4000, 2200, 6.2, 1.0, UKX, "Lucky Strike, Vuse vapes and Velo pouches."],
  ["IMB", "Imperial Brands", "LSE", "Consumer Staples", "Tobacco", 3000, 830, 5.2, 0.9, UKX, "Tobacco and next-generation products; big buybacks."],
  ["RKT", "Reckitt", "LSE", "Consumer Staples", "Household & Personal Products", 5300, 680, 3.8, 1.0, UKX, "Dettol, Durex and Finish."],
  ["HLN", "Haleon", "LSE", "Consumer Staples", "Household & Personal Products", 360, 9000, 1.9, 0.8, UKX, "Sensodyne, Panadol and Centrum."],
  ["SBRY", "Sainsbury's", "LSE", "Consumer Staples", "Grocery Stores", 300, 2300, 4.6, 0.9, UKX, "The UK's second-largest grocer, owner of Argos."],
  ["ABF", "Associated British Foods", "LSE", "Consumer Staples", "Packaged Foods", 2100, 715, 3.0, 1.0, UKX, "Primark plus sugar, grocery and ingredients."],
  ["REL", "RELX", "LSE", "Industrials", "Specialty Business Services", 3300, 1850, 1.9, 0.8, UKX, "Data and analytics for science, law and risk."],
  ["EXPN", "Experian", "LSE", "Industrials", "Consulting Services", 3700, 915, 1.3, 0.9, UKX, "Credit bureau and data analytics."],
  ["CPG", "Compass Group", "LSE", "Consumer Discretionary", "Restaurants", 2600, 1700, 1.8, 0.8, UKX, "The world's largest contract caterer."],
  ["IAG", "International Airlines Group", "LSE", "Industrials", "Airlines", 380, 4700, 1.6, 1.6, UKX, "British Airways, Iberia, Aer Lingus and Vueling."],
  ["MKS", "Marks and Spencer", "LSE", "Consumer Discretionary", "Department Stores", 360, 2050, 1.0, 1.2, UKX, "Clothing, home and a premium food hall."],
  ["JD", "JD Sports Fashion", "LSE", "Consumer Discretionary", "Apparel Retail", 85, 5100, 1.2, 1.7, MCX, "Trainers and sportswear across Europe and the US."],
  ["RIO", "Rio Tinto", "LSE", "Materials", "Other Industrial Metals & Mining", 5000, 1250, 6.0, 1.1, UKX, "Iron ore, copper and aluminium."],
  ["GLEN", "Glencore", "LSE", "Materials", "Other Industrial Metals & Mining", 350, 12000, 2.8, 1.3, UKX, "Mining and commodity trading."],
  ["AAL", "Anglo American", "LSE", "Materials", "Other Industrial Metals & Mining", 2600, 1070, 1.5, 1.4, UKX, "Copper, iron ore and crop nutrients."],
  ["NG", "National Grid", "LSE", "Utilities", "Utilities - Regulated Electric", 1050, 4900, 4.4, 0.8, UKX, "Electricity transmission in England, Wales and the US north-east."],
  ["SSE", "SSE", "LSE", "Utilities", "Utilities - Regulated Electric", 1800, 1100, 3.5, 0.9, UKX, "Electricity networks and a large renewables fleet."],
  ["LSEG", "London Stock Exchange Group", "LSE", "Financials", "Financial Data & Stock Exchanges", 9500, 520, 1.4, 0.9, UKX, "The LSE plus Refinitiv financial data."],
  ["PRU", "Prudential", "LSE", "Financials", "Insurance - Life", 900, 2700, 2.0, 1.2, UKX, "Life insurance and savings in Asia and Africa."],
  ["LGEN", "Legal & General", "LSE", "Financials", "Insurance - Life", 240, 5800, 8.7, 0.9, UKX, "Pensions, annuities and investment management."],
  ["AV", "Aviva", "LSE", "Financials", "Insurance - Diversified", 620, 3000, 6.4, 0.9, UKX, "The UK's largest insurer, now including Direct Line."],
  ["NWG", "NatWest Group", "LSE", "Financials", "Banks - Regional", 520, 8100, 4.9, 1.1, UKX, "UK high-street bank, back in full private ownership."],
  ["STAN", "Standard Chartered", "LSE", "Financials", "Banks - Diversified", 1400, 2400, 2.4, 1.2, UKX, "Emerging-markets bank focused on Asia, Africa and the Middle East."],
  ["III", "3i Group", "LSE", "Financials", "Asset Management", 4000, 965, 1.6, 1.0, UKX, "Private equity, with Action discount stores as its crown jewel."],
  ["SGE", "Sage Group", "LSE", "Technology", "Software - Application", 1150, 1000, 1.8, 0.9, UKX, "Accounting and payroll software for small businesses."],
  ["WPP", "WPP", "LSE", "Communication Services", "Advertising Agencies", 350, 1080, 4.0, 1.4, UKX, "The world's largest advertising group, in the middle of a reset."],
  ["OCDO", "Ocado Group", "LSE", "Consumer Staples", "Grocery Stores", 230, 830, 0, 2.2, MCX, "Online grocery and warehouse-robotics technology."],
  // --- Names people search for most (added with the search upgrade) -------------
  ["PLUS", "Plus500", "LSE", "Financials", "Capital Markets", 3300, 71, 3.0, 1.2, MCX, "Online trading platform for CFDs and share dealing, expanding into US futures."],
  ["RMV", "Rightmove", "LSE", "Communication Services", "Internet Content & Information", 720, 770, 1.4, 1.0, UKX, "The UK's biggest property portal."],
  ["NXT", "Next", "LSE", "Consumer Discretionary", "Apparel Retail", 12500, 117, 1.8, 0.9, UKX, "Clothing and homeware retailer with a strong online business."],
  ["PSN", "Persimmon", "LSE", "Consumer Discretionary", "Residential Construction", 1250, 320, 4.8, 1.3, UKX, "One of the UK's largest housebuilders."],
  ["EZJ", "easyJet", "LSE", "Industrials", "Airlines", 500, 758, 2.4, 1.4, UKX, "Europe's second-largest low-cost airline, plus easyJet holidays."],
  ["CNA", "Centrica", "LSE", "Utilities", "Utilities - Diversified", 160, 4800, 2.8, 1.0, UKX, "Owner of British Gas, with energy trading and gas storage."],
  ["KGF", "Kingfisher", "LSE", "Consumer Discretionary", "Home Improvement Retail", 270, 1780, 4.6, 1.1, UKX, "B&Q, Screwfix and Castorama."],
  ["AUTO", "Auto Trader Group", "LSE", "Communication Services", "Internet Content & Information", 760, 880, 1.3, 0.9, UKX, "The UK's largest marketplace for buying and selling cars."],
  ["GAW", "Games Workshop", "LSE", "Consumer Discretionary", "Leisure", 15000, 33, 3.0, 1.3, UKX, "Warhammer miniatures, plus licensing for video games and TV."],
  ["ADM", "Admiral Group", "LSE", "Financials", "Insurance - Property & Casualty", 3300, 306, 5.5, 0.9, UKX, "Car and home insurer known for its low-cost model."],
  ["TSM", "Taiwan Semiconductor", "NYSE", "Technology", "Semiconductors", 280, 5187, 1.2, 1.2, [], "Makes most of the world's advanced chips, including Nvidia's and Apple's.", "Asia", "Taiwan"],
  ["ASML", "ASML", "NASDAQ", "Technology", "Semiconductor Equipment & Materials", 900, 390, 0.9, 1.2, ["NDX"], "The only maker of the EUV machines that print leading-edge chips.", "Europe", "Netherlands"],
  ["BABA", "Alibaba", "NYSE", "Consumer Discretionary", "Internet Retail", 140, 2300, 1.0, 1.6, [], "China's largest e-commerce group, with a fast-growing cloud business.", "Asia", "China"],
  ["GME", "GameStop", "NYSE", "Consumer Discretionary", "Specialty Retail", 25, 447, 0, 2.2, [], "Video-game retailer, famous for the 2021 meme-stock squeeze."],
  ["MSTR", "Strategy (MicroStrategy)", "NASDAQ", "Technology", "Software - Application", 350, 280, 0, 2.5, ["NDX"], "Software company turned bitcoin holder: its shares move with the price of bitcoin."],
];

function driftFor(seed: number): number {
  return Math.round((((seed * 37) % 17) / 16) * 17 - 5) / 100; // -0.05 … +0.12
}

function build(r: Row, k: number): Instrument {
  const [symbol, name, exchange, sector, industry, price, sharesM, yieldPct, volMult, indices, description, region, country] = r;
  const lse = exchange === "LSE";
  const seed = 101 + k;
  const currency: Currency = lse ? "GBX" : "USD";
  return {
    symbol,
    name,
    type: "stock",
    exchange,
    currency,
    region: region ?? (lse ? "UK" : "US"),
    sector,
    assetClass: "Equity",
    dividendYieldPct: yieldPct,
    shortable: false,
    description,
    base: price,
    vol: Math.round((SECTOR_VOL[sector] ?? 0.016) * volMult * 10000) / 10000,
    drift: driftFor(seed),
    seed,
    finnhub: lse ? `${symbol}.L` : symbol,
    industry,
    indices,
    sharesM,
    ...(country ? { country } : {}),
  };
}

export const EXTRA_STOCKS: Instrument[] = ROWS.map(build);

// Investment themes — the stories people actually invest in. A share can sit in
// several. Used by the screener's Theme filter.
export const THEMES: Record<string, { label: string; symbols: string[] }> = {
  ai: { label: "Artificial intelligence", symbols: ["NVDA", "MSFT", "GOOGL", "META", "AMZN", "AVGO", "AMD", "PLTR", "ORCL", "MU", "ARM", "DELL", "ANET", "CRM", "NOW", "SNOW", "TSLA", "IBM", "CEG", "TSM"] },
  chips: { label: "Semiconductors", symbols: ["NVDA", "AMD", "AVGO", "INTC", "QCOM", "TXN", "MU", "AMAT", "ARM", "TSM", "ASML"] },
  cloud: { label: "Cloud and software", symbols: ["MSFT", "AMZN", "GOOGL", "ORCL", "CRM", "ADBE", "NOW", "INTU", "SNOW", "SHOP", "SGE", "PLTR"] },
  cyber: { label: "Cybersecurity", symbols: ["CRWD", "PANW", "CSCO", "MSFT"] },
  ev: { label: "Electric vehicles", symbols: ["TSLA", "GM", "F"] },
  obesity: { label: "Obesity and diabetes drugs", symbols: ["LLY", "NVO", "AZN", "AMGN"] },
  defence: { label: "Defence and aerospace", symbols: ["LMT", "RTX", "BA", "GE", "RR"] },
  energy_transition: { label: "Clean energy and nuclear", symbols: ["NEE", "CEG", "SSE", "NG", "FCX"] },
  oil: { label: "Oil and gas", symbols: ["XOM", "CVX", "COP", "OXY", "SLB", "BP", "SHEL"] },
  crypto: { label: "Crypto-linked", symbols: ["COIN", "HOOD", "MSTR", "BTC", "ETH", "SOL", "XRP", "DOGE"] },
  fintech: { label: "Payments and fintech", symbols: ["V", "MA", "PYPL", "AXP", "SHOP", "COIN", "HOOD", "PLUS"] },
  banks: { label: "Banks", symbols: ["JPM", "BAC", "WFC", "GS", "MS", "LLOY", "BARC", "HSBA", "NWG", "STAN"] },
  brands: { label: "Consumer brands", symbols: ["AAPL", "KO", "PEP", "MCD", "NKE", "SBUX", "PG", "DIS", "ULVR", "DGE", "RKT", "HLN", "MDLZ"] },
  income: { label: "Dividend stalwarts", symbols: ["KO", "PG", "JNJ", "PEP", "MCD", "VZ", "T", "XOM", "CVX", "ABBV", "O", "LGEN", "BATS", "IMB", "NG", "ULVR", "SHEL", "HSBA"] },
  streaming: { label: "Streaming and media", symbols: ["NFLX", "DIS", "SPOT", "CMCSA", "GOOGL"] },
  uk_retail: { label: "UK high street", symbols: ["TSCO", "SBRY", "MKS", "ABF", "JD", "OCDO", "CPG", "NXT", "KGF"] },
  miners: { label: "Mining and metals", symbols: ["RIO", "GLEN", "AAL", "FCX", "NEM"] },
  travel: { label: "Travel and leisure", symbols: ["BKNG", "ABNB", "IAG", "UBER", "CPG", "EZJ"] },
};
