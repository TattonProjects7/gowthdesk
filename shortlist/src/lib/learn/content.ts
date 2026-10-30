// Shortlist Academy — bite-size lessons, quizzes and a glossary.
//
// Inspired by Robinhood Learn and "Learn & Earn": short card-by-card lessons,
// a three-question quiz, XP and practice cash for finishing. Every track ties
// back to a real screen in the app so learning turns straight into doing.
// Facts are UK-specific where it matters (ISA, SIPP, CGT, stamp duty, FSCS).

export type TrackId = "basics" | "funds" | "uk" | "charts" | "risk" | "shorts";
export type Widget = "compound" | "fees" | "sizing" | "diversify" | "chart";

export interface Card {
  emoji: string;
  title: string;
  body: string;
  widget?: Widget;
  symbol?: string; // for the live chart widget
  tryIt?: { label: string; href: string };
}

export interface Question {
  q: string;
  options: string[];
  answer: number; // index into options
  why: string;
}

export interface Lesson {
  id: string;
  track: TrackId;
  title: string;
  minutes: number;
  xp: number;
  reward: number; // practice £ credited once, on first completion
  cards: Card[];
  quiz: Question[];
}

export interface Track {
  id: TrackId;
  title: string;
  emoji: string;
  blurb: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  gradient: string; // tailwind classes
}

export const TRACKS: Track[] = [
  { id: "basics", title: "Investing 101", emoji: "🌱", blurb: "Shares, markets, risk and the magic of compounding.", level: "Beginner", gradient: "from-emerald-500/25 to-emerald-900/10" },
  { id: "funds", title: "Funds & ETFs", emoji: "🧺", blurb: "Own hundreds of companies in one trade — and keep fees low.", level: "Beginner", gradient: "from-sky-500/25 to-sky-900/10" },
  { id: "uk", title: "ISAs, SIPPs & tax", emoji: "🇬🇧", blurb: "The UK wrappers that keep more of your returns.", level: "Beginner", gradient: "from-violet-500/25 to-violet-900/10" },
  { id: "charts", title: "Reading charts", emoji: "📈", blurb: "Trends, momentum and volatility — the indicators on every chart.", level: "Intermediate", gradient: "from-amber-500/25 to-amber-900/10" },
  { id: "risk", title: "Risk & orders", emoji: "🛡️", blurb: "Order types, stop-losses, position sizing and your own biases.", level: "Intermediate", gradient: "from-rose-500/25 to-rose-900/10" },
  { id: "shorts", title: "Shorting & squeezes", emoji: "📉", blurb: "Profit from falls — and avoid the traps that wipe shorts out.", level: "Advanced", gradient: "from-fuchsia-500/25 to-fuchsia-900/10" },
];

export const LESSONS: Lesson[] = [
  // ---------------------------------------------------------------- basics
  {
    id: "what-is-a-share",
    track: "basics",
    title: "What is a share?",
    minutes: 2,
    xp: 60,
    reward: 20,
    cards: [
      { emoji: "🍕", title: "A slice of a company", body: "A share is a tiny piece of ownership in a company. Buy one share of Tesco and you own a sliver of every shop, lorry and loaf it sells." },
      { emoji: "💷", title: "Two ways to make money", body: "If the company grows, other investors will pay more for your slice — that's a capital gain. Many companies also pay out part of their profits as dividends, straight to shareholders." },
      { emoji: "🔪", title: "Fractional shares", body: "Some shares cost hundreds of pounds. Fractional dealing lets you buy a slice of a share — £1 of Apple is 1/200th of one share. Shortlist lets you invest from £1.", tryIt: { label: "Buy £1 of Apple", href: "/i/AAPL" } },
      { emoji: "⚖️", title: "Ownership cuts both ways", body: "Shareholders are last in the queue if a company fails. Prices can fall as well as rise, and you could get back less than you put in." },
    ],
    quiz: [
      { q: "What does owning a share give you?", options: ["A loan to the company", "A small piece of ownership", "A guaranteed dividend"], answer: 1, why: "A share is part-ownership. Dividends are paid at the company's discretion, never guaranteed." },
      { q: "A company pays part of its profit to shareholders. That's called…", options: ["A dividend", "A capital gain", "A spread"], answer: 0, why: "Dividends are cash paid from profits. A capital gain is the rise in the share's price." },
      { q: "A share costs £300 and you invest £30. How much do you own?", options: ["Nothing — you need a whole share", "One tenth of a share", "Thirty shares"], answer: 1, why: "With fractional dealing £30 buys 0.1 of a £300 share." },
    ],
  },
  {
    id: "how-markets-move",
    track: "basics",
    title: "Why prices move",
    minutes: 2,
    xp: 60,
    reward: 20,
    cards: [
      { emoji: "🧲", title: "Buyers vs sellers", body: "A share price is simply the last price a buyer and seller agreed on. More eager buyers than sellers pushes it up; more sellers pushes it down." },
      { emoji: "📰", title: "News changes expectations", body: "Prices move on what people expect a company to earn in future. Results, interest-rate decisions, new products and scandals all shift expectations — sometimes in seconds." },
      { emoji: "🎢", title: "Short term is noisy", body: "Day to day, prices bounce around for reasons that often don't matter. Over years, they tend to follow profits. That's why time in the market usually beats timing the market." },
      { emoji: "🗓️", title: "Know the calendar", body: "Big moves cluster around scheduled events: company results and central-bank decisions. The Markets tab lists what's coming up.", tryIt: { label: "See the calendar", href: "/markets" } },
    ],
    quiz: [
      { q: "More people want to buy a share than sell it. What usually happens?", options: ["The price rises", "The price falls", "Nothing"], answer: 0, why: "Excess demand pushes the price up until enough sellers appear." },
      { q: "What do prices mostly reflect over the long run?", options: ["Social media hype", "Expected future profits", "The day of the week"], answer: 1, why: "Over years, share prices tend to track what companies earn." },
      { q: "Which event commonly causes a big one-day move?", options: ["A company's results day", "A bank holiday", "A new logo"], answer: 0, why: "Results reset expectations, so prices often jump or drop on the day." },
    ],
  },
  {
    id: "risk-and-return",
    track: "basics",
    title: "Risk and return",
    minutes: 3,
    xp: 70,
    reward: 20,
    cards: [
      { emoji: "🎯", title: "No free lunch", body: "Investments that can grow faster usually swing harder too. Cash is steady but grows slowly; shares grow faster over time but can fall 30% or more in a bad year." },
      { emoji: "🌊", title: "Volatility", body: "Volatility measures how much a price jumps around. Bitcoin's daily swings are often several times the size of a FTSE 100 fund's. Each instrument page shows its daily volatility." },
      { emoji: "🥚", title: "Don't put all your eggs in one basket", body: "If you own one company and it stumbles, you feel all of it. Spread across many, one bad apple barely dents you. That's diversification — the only free lunch in investing.", widget: "diversify" },
      { emoji: "⏳", title: "Time is your friend", body: "Money you need next year shouldn't ride the stock market. Money for 10+ years can, because there's time to recover from falls." },
    ],
    quiz: [
      { q: "Which is generally true?", options: ["Higher potential return comes with higher risk", "The safest investments grow fastest", "Risk and return are unrelated"], answer: 0, why: "To earn more you usually accept bigger ups and downs." },
      { q: "Diversification means…", options: ["Buying more of your best share", "Spreading money across many investments", "Selling everything when prices fall"], answer: 1, why: "Spreading out means no single company can sink you." },
      { q: "You need the money in 6 months for a house deposit. Best fit?", options: ["Crypto", "A single tech share", "Cash savings"], answer: 2, why: "Short-term money shouldn't be exposed to market falls." },
    ],
  },
  {
    id: "compounding",
    track: "basics",
    title: "The magic of compounding",
    minutes: 2,
    xp: 70,
    reward: 25,
    cards: [
      { emoji: "❄️", title: "A snowball", body: "Compounding is earning returns on your returns. £1,000 growing 7% a year becomes £1,070, then £1,145, then £1,225… the growth itself starts to grow." },
      { emoji: "🧮", title: "Try it yourself", body: "Slide the monthly amount and the years. Notice how the last decade adds more than the first two put together.", widget: "compound" },
      { emoji: "🔁", title: "Make it automatic", body: "The easiest way to compound is a regular investment that runs whether you remember or not. Set up a savings plan in Automate.", tryIt: { label: "Start a savings plan", href: "/portfolio?tab=automate" } },
    ],
    quiz: [
      { q: "Compounding means earning returns on…", options: ["Only your deposits", "Your deposits and past returns", "Other people's money"], answer: 1, why: "Returns get reinvested, so they earn returns too." },
      { q: "Which matters most for compounding?", options: ["Time", "Luck", "The colour of the app"], answer: 0, why: "The longer money compounds, the bigger the snowball." },
      { q: "Reinvesting dividends instead of spending them usually…", options: ["Slows growth", "Speeds up growth", "Has no effect"], answer: 1, why: "Reinvested dividends buy more units, which earn more." },
    ],
  },

  // ----------------------------------------------------------------- funds
  {
    id: "what-is-an-etf",
    track: "funds",
    title: "What's an ETF?",
    minutes: 2,
    xp: 60,
    reward: 20,
    cards: [
      { emoji: "🧺", title: "A basket you can buy in one go", body: "An exchange-traded fund (ETF) holds lots of investments and trades on the stock exchange like a single share. One purchase of VWRL gives you a slice of about 3,600 companies worldwide." },
      { emoji: "📏", title: "Most ETFs track an index", body: "An index is a list — like the FTSE 100 or S&P 500. A tracker ETF simply owns what's on the list, so you get the market's return minus a small fee." },
      { emoji: "🔍", title: "Look inside", body: "Every ETF page shows its top holdings, sectors and regions. Have a look at what's inside the S&P 500 fund.", tryIt: { label: "Open VUSA", href: "/i/VUSA" } },
      { emoji: "🏷️", title: "No stamp duty", body: "UK share purchases usually carry 0.5% stamp duty. ETFs are exempt, which is one more reason they're popular." },
    ],
    quiz: [
      { q: "An ETF is best described as…", options: ["A single company", "A basket of investments traded like a share", "A savings account"], answer: 1, why: "ETFs bundle many holdings into one tradable fund." },
      { q: "A tracker ETF aims to…", options: ["Beat the market", "Match an index, minus fees", "Avoid all losses"], answer: 1, why: "Trackers copy an index rather than picking winners." },
      { q: "Do you pay 0.5% UK stamp duty when buying an ETF?", options: ["Yes", "No"], answer: 1, why: "ETFs are exempt from UK stamp duty." },
    ],
  },
  {
    id: "fees-matter",
    track: "funds",
    title: "Why fees matter",
    minutes: 2,
    xp: 70,
    reward: 25,
    cards: [
      { emoji: "🐜", title: "Small numbers, big effect", body: "Funds charge an ongoing charge figure (OCF) every year. 1% sounds tiny, but it comes out of your pot every single year — and compounds against you." },
      { emoji: "📊", title: "See the gap", body: "Compare a 0.07% tracker with a 1% fund on the same investment. The difference over 25 years is often thousands of pounds.", widget: "fees" },
      { emoji: "🧾", title: "Watch FX fees too", body: "Buying US shares means converting pounds to dollars. Brokers charge for that — Shortlist shows its 0.5% FX fee in the deal ticket before you buy." },
    ],
    quiz: [
      { q: "What is an OCF?", options: ["A one-off joining fee", "A fund's yearly running cost", "A tax"], answer: 1, why: "The ongoing charge figure is taken every year." },
      { q: "Over 25 years, a 1% fee vs 0.1% fee usually…", options: ["Makes no difference", "Costs you a meaningful slice of your pot", "Saves you money"], answer: 1, why: "Fees compound against you just like returns compound for you." },
      { q: "Where does Shortlist show the FX fee?", options: ["In the deal ticket before you buy", "Only on your annual statement", "Nowhere"], answer: 0, why: "The cost preview shows it up front." },
    ],
  },
  {
    id: "look-through",
    track: "funds",
    title: "What do you really own?",
    minutes: 2,
    xp: 70,
    reward: 25,
    cards: [
      { emoji: "🪆", title: "Funds inside funds", body: "Own an S&P 500 fund, a Nasdaq fund and Apple shares? You own Apple three times. Funds overlap more than people think." },
      { emoji: "🔬", title: "Look-through", body: "Look-through analysis breaks every fund into the companies inside it, so you see your true exposure by company, sector and region." },
      { emoji: "⚠️", title: "Spot hidden concentration", body: "If one company is more than 10% of everything you own, that's concentration risk — even if it's spread across several funds. Check your Overlap Check.", tryIt: { label: "Open my analytics", href: "/portfolio?tab=analytics" } },
    ],
    quiz: [
      { q: "You hold an S&P 500 ETF and a Nasdaq-100 ETF. Which is likely?", options: ["They overlap heavily in big US tech", "They hold completely different companies", "One cancels the other out"], answer: 0, why: "Apple, Microsoft and NVIDIA sit near the top of both." },
      { q: "Look-through analysis shows…", options: ["Tomorrow's price", "The underlying companies, sectors and regions you own", "Your tax bill"], answer: 1, why: "It expands each fund into its holdings." },
      { q: "One company is 25% of your total portfolio. That's…", options: ["Well diversified", "Concentration risk", "Impossible with ETFs"], answer: 1, why: "A single name at 25% can hurt badly if it falls." },
    ],
  },

  // -------------------------------------------------------------------- uk
  {
    id: "isas",
    track: "uk",
    title: "Stocks & Shares ISAs",
    minutes: 3,
    xp: 70,
    reward: 25,
    cards: [
      { emoji: "🛡️", title: "A tax shield", body: "An ISA is a wrapper, not an investment. Anything inside it — shares, funds, ETFs — grows free of UK income tax and capital gains tax." },
      { emoji: "💳", title: "£20,000 a year", body: "You can put up to £20,000 into ISAs each tax year (6 April to 5 April). Unused allowance doesn't roll over, so it's use-it-or-lose-it." },
      { emoji: "🧾", title: "No paperwork", body: "You don't declare ISA gains or dividends on a tax return. Withdraw whenever you like — though putting money back may count against your allowance unless the ISA is 'flexible'." },
      { emoji: "🏦", title: "Open one in practice", body: "Shortlist lets you open a practice ISA and see how it sits beside a general account.", tryIt: { label: "Open a practice ISA", href: "/portfolio?tab=accounts" } },
    ],
    quiz: [
      { q: "What is the annual ISA allowance?", options: ["£5,000", "£20,000", "Unlimited"], answer: 1, why: "You can pay in up to £20,000 per tax year across your ISAs." },
      { q: "Gains inside a Stocks & Shares ISA are…", options: ["Taxed at 20%", "Free of UK capital gains tax", "Taxed when you log in"], answer: 1, why: "ISA growth and income are free of UK income tax and CGT." },
      { q: "When does the UK tax year start?", options: ["1 January", "6 April", "1 September"], answer: 1, why: "It runs 6 April to 5 April." },
    ],
  },
  {
    id: "sipps",
    track: "uk",
    title: "SIPPs and pensions",
    minutes: 3,
    xp: 70,
    reward: 25,
    cards: [
      { emoji: "🧓", title: "Investing for later life", body: "A SIPP is a self-invested personal pension. You choose the investments; the government tops up your contributions with tax relief." },
      { emoji: "🎁", title: "Free money from tax relief", body: "Pay £80 into a SIPP and basic-rate relief takes it to £100. Higher-rate taxpayers can claim more back through their tax return." },
      { emoji: "🔒", title: "Locked until 55", body: "You can't usually take money out until age 55 — rising to 57 from April 2028. At that point you can normally take 25% tax-free." },
      { emoji: "⚖️", title: "ISA or SIPP?", body: "ISAs are flexible; SIPPs give an upfront boost but lock money away. Many people use both: ISA for medium-term goals, SIPP for retirement." },
    ],
    quiz: [
      { q: "A basic-rate taxpayer pays £80 into a SIPP. How much goes in after tax relief?", options: ["£80", "£96", "£100"], answer: 2, why: "20% basic-rate relief tops £80 up to £100." },
      { q: "From April 2028, the normal minimum age to access a pension rises to…", options: ["55", "57", "67"], answer: 1, why: "The normal minimum pension age moves from 55 to 57." },
      { q: "Compared with an ISA, a SIPP is…", options: ["More flexible", "Less flexible but has tax relief on the way in", "Exactly the same"], answer: 1, why: "SIPPs trade flexibility for upfront tax relief." },
    ],
  },
  {
    id: "gia-tax",
    track: "uk",
    title: "General accounts & tax",
    minutes: 2,
    xp: 60,
    reward: 20,
    cards: [
      { emoji: "📂", title: "No limits, no shield", body: "A general investment account (GIA) has no allowance cap, but gains and dividends can be taxed. It's where money goes once your ISA is full." },
      { emoji: "✂️", title: "The allowances", body: "Each tax year you can make £3,000 of capital gains and receive £500 of dividends tax-free outside wrappers. Above that, tax depends on your income band." },
      { emoji: "🧠", title: "ISA first, usually", body: "Because ISA growth is tax-free forever, many investors fill their ISA before using a GIA." },
      { emoji: "🛟", title: "FSCS protection", body: "If a regulated UK investment firm fails, the FSCS can cover up to £85,000 per person. It does not cover losses from investments falling in value." },
    ],
    quiz: [
      { q: "What is the annual capital gains tax-free allowance?", options: ["£500", "£3,000", "£12,570"], answer: 1, why: "The CGT annual exempt amount is £3,000." },
      { q: "FSCS protection covers you if…", options: ["Your shares fall in value", "A regulated investment firm fails", "You forget your password"], answer: 1, why: "FSCS protects against firm failure, not market losses." },
      { q: "When does a general account usually make sense?", options: ["Before opening an ISA", "Once your ISA allowance is used", "Never"], answer: 1, why: "ISAs are usually better until their allowance is full." },
    ],
  },

  // ---------------------------------------------------------------- charts
  {
    id: "moving-averages",
    track: "charts",
    title: "Trends & moving averages",
    minutes: 3,
    xp: 80,
    reward: 25,
    cards: [
      { emoji: "〰️", title: "Smoothing the noise", body: "A moving average is the average price over the last N days, recalculated every day. It turns a jagged line into a smooth trend." },
      { emoji: "✖️", title: "Crossovers", body: "When a short average (10-day) crosses above a long one (30-day), momentum is turning up. Crossing below hints at a downtrend. Traders call big versions golden and death crosses." },
      { emoji: "👀", title: "Watch it live", body: "Here's Lloyds with its 10- and 30-day averages switched on. Is the blue line above or below the yellow?", widget: "chart", symbol: "LLOY" },
      { emoji: "🧭", title: "A guide, not a guarantee", body: "Averages lag — they confirm a trend after it starts. Use them for context, not as a crystal ball." },
    ],
    quiz: [
      { q: "A 10-day moving average is…", options: ["The highest price in 10 days", "The average price of the last 10 days", "The price 10 days from now"], answer: 1, why: "It's the rolling mean of the last 10 closes." },
      { q: "The 10-day average crosses above the 30-day. That suggests…", options: ["Momentum turning up", "Momentum turning down", "The company is bankrupt"], answer: 0, why: "Recent prices are now above the longer-term average." },
      { q: "A weakness of moving averages is that they…", options: ["Predict the future perfectly", "Lag behind price", "Only work on Tuesdays"], answer: 1, why: "They're built from past prices, so they react late." },
    ],
  },
  {
    id: "rsi-momentum",
    track: "charts",
    title: "RSI: is it stretched?",
    minutes: 2,
    xp: 80,
    reward: 25,
    cards: [
      { emoji: "🌡️", title: "A momentum thermometer", body: "The Relative Strength Index (RSI) compares recent up-days with down-days on a 0–100 scale." },
      { emoji: "🔥", title: "Above 70: overbought", body: "An RSI over 70 means buyers have pushed hard and fast. It can mean a pause or pullback is due — or just a strong trend." },
      { emoji: "🧊", title: "Below 30: oversold", body: "Under 30, sellers have dominated. Bounces often start here, but cheap can get cheaper." },
      { emoji: "🛠️", title: "Turn it on", body: "Every chart in Shortlist has an RSI button. The short scanner uses RSI as one of its signals.", tryIt: { label: "Open Bitcoin's chart", href: "/i/BTC" } },
    ],
    quiz: [
      { q: "RSI is measured on a scale of…", options: ["0 to 10", "0 to 100", "−1 to 1"], answer: 1, why: "RSI runs from 0 to 100." },
      { q: "An RSI of 78 is usually described as…", options: ["Oversold", "Overbought", "Neutral"], answer: 1, why: "Above 70 is the classic overbought zone." },
      { q: "An RSI under 30 guarantees the price will rise.", options: ["True", "False"], answer: 1, why: "Oversold can stay oversold. RSI is a clue, not a promise." },
    ],
  },
  {
    id: "volatility-bands",
    track: "charts",
    title: "Bollinger Bands & MACD",
    minutes: 3,
    xp: 90,
    reward: 30,
    cards: [
      { emoji: "🎻", title: "Bollinger Bands", body: "Bands sit two standard deviations above and below a 20-day average. They widen when the market gets wild and squeeze tight when it goes quiet." },
      { emoji: "💥", title: "The squeeze", body: "A long, tight squeeze often comes before a big move — though the bands don't tell you which direction." },
      { emoji: "📶", title: "MACD", body: "MACD is the gap between a 12-day and 26-day exponential average, with a 9-day signal line. When MACD crosses above its signal, momentum is improving." },
      { emoji: "🧪", title: "Experiment", body: "Switch on Bollinger and MACD together on any chart and see how they line up with the big moves.", tryIt: { label: "Try it on VUSA", href: "/i/VUSA" } },
    ],
    quiz: [
      { q: "Bollinger Bands widen when…", options: ["Volatility rises", "Volatility falls", "Markets are closed"], answer: 0, why: "Wider bands mean bigger recent swings." },
      { q: "A tight Bollinger squeeze tells you…", options: ["The direction of the next move", "A big move may be coming, direction unknown", "Nothing at all"], answer: 1, why: "Squeezes flag potential breakouts, not their direction." },
      { q: "MACD crossing above its signal line suggests…", options: ["Improving momentum", "Worsening momentum", "A dividend"], answer: 0, why: "It shows short-term momentum overtaking the longer trend." },
    ],
  },

  // ------------------------------------------------------------------ risk
  {
    id: "order-types",
    track: "risk",
    title: "Market, limit & stop orders",
    minutes: 2,
    xp: 70,
    reward: 25,
    cards: [
      { emoji: "⚡", title: "Market order", body: "Buy or sell right now at the best available price. Fast and simple, but you don't control the exact price." },
      { emoji: "🎯", title: "Limit order", body: "Only buy at your price or lower (or sell at your price or higher). You control the price, but it may never fill." },
      { emoji: "🚨", title: "Stop order", body: "A stop sells automatically if the price falls to a level you choose — a safety net that turns into a market sell when triggered." },
      { emoji: "📝", title: "Place one", body: "Open any instrument, switch the deal ticket to Limit and set a price below today's.", tryIt: { label: "Try a limit order", href: "/i/VWRL" } },
    ],
    quiz: [
      { q: "You want to buy only if the price drops to 50p. Use a…", options: ["Market order", "Limit order", "Stop order"], answer: 1, why: "A buy limit waits for your price or better." },
      { q: "The downside of a market order is…", options: ["It may never fill", "You don't control the exact price", "It's illegal"], answer: 1, why: "Market orders fill immediately at whatever the price is." },
      { q: "A stop order is mainly used to…", options: ["Limit losses automatically", "Buy more when prices rise", "Earn dividends"], answer: 0, why: "Stops sell when the price falls to your level." },
    ],
  },
  {
    id: "position-sizing",
    track: "risk",
    title: "Stop-losses & position sizing",
    minutes: 3,
    xp: 90,
    reward: 30,
    cards: [
      { emoji: "🧯", title: "Decide your loss first", body: "Professionals decide how much they're willing to lose before they buy. Many risk just 1–2% of their account on any single idea." },
      { emoji: "📐", title: "Size from the stop", body: "Risk per share is your entry minus your stop. Divide the money you're willing to risk by that, and you have your position size.", widget: "sizing" },
      { emoji: "🪜", title: "Trailing stops", body: "A trailing stop follows the price up and stays a set % below its highest point — locking in gains while giving room to run." },
      { emoji: "🛡️", title: "Protect a holding", body: "In Holdings, tap Protect on any position to add a stop-loss, take-profit or trailing stop.", tryIt: { label: "Open my holdings", href: "/portfolio?tab=holdings" } },
    ],
    quiz: [
      { q: "Account £10,000, risking 1% per idea. Maximum loss per idea?", options: ["£10", "£100", "£1,000"], answer: 1, why: "1% of £10,000 is £100." },
      { q: "Entry 100p, stop 90p, risking £100. How many shares?", options: ["100", "1,000", "10,000"], answer: 1, why: "Risk per share is 10p, so £100 ÷ £0.10 = 1,000 shares." },
      { q: "A 10% trailing stop on a share that rises from £50 to £80 triggers at…", options: ["£45", "£72", "£80"], answer: 1, why: "It sits 10% below the £80 high, at £72." },
    ],
  },
  {
    id: "biases",
    track: "risk",
    title: "Your brain vs your portfolio",
    minutes: 3,
    xp: 80,
    reward: 25,
    cards: [
      { emoji: "😱", title: "Loss aversion", body: "Losses feel roughly twice as painful as equal gains feel good. That makes people sell winners too early and hold losers too long." },
      { emoji: "🚀", title: "FOMO", body: "Fear of missing out pushes people to buy after big rises, often near the top. If you're buying because everyone's talking about it, pause." },
      { emoji: "🔁", title: "Overtrading", body: "Every trade has costs, and frequent trading tends to hurt returns. Shortlist celebrates learning and good habits — never how often you trade." },
      { emoji: "🪞", title: "Confirmation bias", body: "We seek out news that agrees with us. Before any decision, read the strongest argument against it — the short scanner's steel-manned bull case is built for exactly this." },
    ],
    quiz: [
      { q: "Loss aversion means people tend to…", options: ["Feel losses more than equal gains", "Enjoy losing money", "Never sell"], answer: 0, why: "Losses loom larger, which skews decisions." },
      { q: "Buying a share only because it's all over social media is a sign of…", options: ["FOMO", "Diversification", "Dividend investing"], answer: 0, why: "That's fear of missing out." },
      { q: "Trading very frequently usually…", options: ["Improves returns", "Adds costs and tends to hurt returns", "Has no effect"], answer: 1, why: "Costs and poor timing add up." },
    ],
  },

  // ---------------------------------------------------------------- shorts
  {
    id: "short-selling",
    track: "shorts",
    title: "How short selling works",
    minutes: 3,
    xp: 90,
    reward: 30,
    cards: [
      { emoji: "🔄", title: "Sell first, buy later", body: "A short seller borrows shares, sells them, and hopes to buy them back cheaper later. The difference is the profit." },
      { emoji: "♾️", title: "Uncapped risk", body: "A share can only fall to zero, so a normal investor can lose 100%. A short can lose far more, because there's no ceiling on how high a price can go." },
      { emoji: "🏷️", title: "It costs to borrow", body: "Shorts pay a borrow fee, which can soar for popular shorts. In the UK, retail investors usually short through CFDs or spread bets, which are leveraged and high-risk." },
      { emoji: "🧪", title: "Practise safely", body: "Shortlist's scanner structures every short with a fixed maximum loss so you can learn the mechanics with paper money.", tryIt: { label: "Open the short scanner", href: "/scan" } },
    ],
    quiz: [
      { q: "A short seller profits when the price…", options: ["Rises", "Falls", "Stays the same"], answer: 1, why: "They sell high now and buy back lower later." },
      { q: "Why is shorting riskier than buying?", options: ["Losses are uncapped", "You can't sell", "Dividends are higher"], answer: 0, why: "Prices have no upper limit, so losses have no cap." },
      { q: "Shorts usually pay…", options: ["A borrow fee", "Nothing", "A government bonus"], answer: 0, why: "Borrowing shares costs money." },
    ],
  },
  {
    id: "squeezes",
    track: "shorts",
    title: "Short squeezes",
    minutes: 3,
    xp: 90,
    reward: 30,
    cards: [
      { emoji: "🗜️", title: "Trapped shorts", body: "When lots of people are short and the price rises, they rush to buy back. That buying pushes the price higher, forcing more to buy — a squeeze." },
      { emoji: "🎮", title: "GameStop, 2021", body: "Short interest in GameStop exceeded 100% of its free float. A wave of buying sent the price up more than tenfold in weeks and crushed several funds." },
      { emoji: "📏", title: "Measuring the danger", body: "Watch short interest (% of float sold short), days to cover (how long shorts need to buy back) and the borrow fee. High numbers mean danger." },
      { emoji: "📡", title: "The squeeze radar", body: "Shortlist flags crowded shorts as a warning, not an opportunity.", tryIt: { label: "See Coinbase's radar", href: "/short/COIN" } },
    ],
    quiz: [
      { q: "A short squeeze is fuelled by…", options: ["Shorts being forced to buy back", "Dividends", "Low volatility"], answer: 0, why: "Short covering is buying, which drives prices up." },
      { q: "High days-to-cover means…", options: ["Shorts can exit quickly", "Shorts would need many days to buy back", "The share is cheap"], answer: 1, why: "It shows how trapped shorts are." },
      { q: "On Shortlist, a crowded short is treated as…", options: ["A great opportunity", "A danger", "Irrelevant"], answer: 1, why: "Crowding raises squeeze risk." },
    ],
  },
  {
    id: "defined-risk",
    track: "shorts",
    title: "Defined risk with put options",
    minutes: 3,
    xp: 100,
    reward: 35,
    cards: [
      { emoji: "🎟️", title: "A put is like insurance", body: "A put option gives you the right to sell a share at a fixed price (the strike) before a date. If the price falls below the strike, the put gains value." },
      { emoji: "🧱", title: "Loss capped at the premium", body: "The most a put buyer can lose is the premium they paid. No squeeze can force you out and there's no margin call." },
      { emoji: "⌛", title: "Time decay", body: "Options lose value as expiry approaches. You need the move to happen soon enough, not just eventually." },
      { emoji: "⚖️", title: "Compare both", body: "Each short setup on Shortlist shows the equivalent put, priced with Black–Scholes, beside the share short.", tryIt: { label: "Compare on a setup", href: "/scan" } },
    ],
    quiz: [
      { q: "The maximum loss when buying a put is…", options: ["Unlimited", "The premium paid", "The share price"], answer: 1, why: "If it expires worthless you lose only what you paid." },
      { q: "A put gains value when the share price…", options: ["Rises", "Falls below the strike", "Pays a dividend"], answer: 1, why: "It's the right to sell high when the market is lower." },
      { q: "Time decay means options…", options: ["Gain value over time", "Lose value as expiry approaches", "Never expire"], answer: 1, why: "Less time left means less chance of a big move." },
    ],
  },
];

export function lessonsFor(track: TrackId): Lesson[] {
  return LESSONS.filter((l) => l.track === track);
}

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function getTrack(id: TrackId): Track {
  return TRACKS.find((t) => t.id === id)!;
}

export function nextLessonAfter(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}

// Recommended starting track for each experience level.
export const START_TRACK: Record<"beginner" | "intermediate" | "advanced", TrackId> = {
  beginner: "basics",
  intermediate: "charts",
  advanced: "shorts",
};

// ---------------------------------------------------------------------------
// Glossary — powers "tap to explain" and the offline coach.
// ---------------------------------------------------------------------------

export interface Term {
  term: string;
  aliases: string[];
  short: string;
  lesson?: string;
}

export const GLOSSARY: Term[] = [
  { term: "Share", aliases: ["stock", "equity", "shares", "stocks"], short: "A small piece of ownership in a company.", lesson: "what-is-a-share" },
  { term: "Dividend", aliases: ["dividends"], short: "Cash a company pays shareholders from its profits. Not guaranteed.", lesson: "what-is-a-share" },
  { term: "Dividend yield", aliases: ["yield"], short: "Yearly dividends as a percentage of the price. A 4% yield pays about £4 a year per £100 invested.", lesson: "gia-tax" },
  { term: "Fractional share", aliases: ["fractional", "fractions"], short: "Part of a share, so you can invest a set amount like £10 instead of buying whole shares.", lesson: "what-is-a-share" },
  { term: "ETF", aliases: ["etfs", "exchange-traded fund", "fund", "funds", "tracker"], short: "A basket of investments that trades on an exchange like a share. Most track an index.", lesson: "what-is-an-etf" },
  { term: "Index", aliases: ["ftse 100", "s&p 500", "indices"], short: "A list of companies used to measure a market, like the FTSE 100 or S&P 500.", lesson: "what-is-an-etf" },
  { term: "OCF", aliases: ["ongoing charge", "fees", "fee", "expense ratio", "ter"], short: "Ongoing charge figure: a fund's yearly running cost, taken from your investment.", lesson: "fees-matter" },
  { term: "Diversification", aliases: ["diversify", "diversified", "diversifying"], short: "Spreading money across many investments so no single one can sink you.", lesson: "risk-and-return" },
  { term: "Volatility", aliases: ["volatile", "swings"], short: "How much a price jumps around. Higher volatility means bigger ups and downs.", lesson: "risk-and-return" },
  { term: "Drawdown", aliases: ["max drawdown", "maximum drawdown"], short: "The fall from a peak to a low, in %. A 30% drawdown means it dropped 30% from its high.", lesson: "risk-and-return" },
  { term: "Compounding", aliases: ["compound", "compound interest", "compound growth"], short: "Earning returns on your past returns, so growth snowballs over time.", lesson: "compounding" },
  { term: "ISA", aliases: ["stocks and shares isa", "stocks & shares isa", "isas"], short: "A UK tax wrapper: up to £20,000 a year, growth and income free of UK tax.", lesson: "isas" },
  { term: "SIPP", aliases: ["pension", "sipps", "self-invested personal pension"], short: "A personal pension you invest yourself. Tax relief on the way in; locked until 55 (57 from 2028).", lesson: "sipps" },
  { term: "GIA", aliases: ["general account", "general investment account"], short: "A taxable investment account with no annual limit.", lesson: "gia-tax" },
  { term: "Capital gains tax", aliases: ["cgt", "capital gains"], short: "Tax on profits when you sell investments outside an ISA or pension, above the £3,000 yearly allowance.", lesson: "gia-tax" },
  { term: "Stamp duty", aliases: ["sdrt"], short: "A 0.5% tax on most UK share purchases. ETFs and US shares don't carry it.", lesson: "what-is-an-etf" },
  { term: "FSCS", aliases: ["financial services compensation scheme"], short: "Covers up to £85,000 if a regulated UK investment firm fails. Doesn't cover market losses.", lesson: "gia-tax" },
  { term: "Moving average", aliases: ["ma", "moving averages", "sma", "ema", "golden cross", "death cross"], short: "The average price over the last N days. Used to see the trend through the noise.", lesson: "moving-averages" },
  { term: "RSI", aliases: ["relative strength index", "overbought", "oversold"], short: "A 0–100 momentum gauge. Above 70 is 'overbought', below 30 'oversold'.", lesson: "rsi-momentum" },
  { term: "Bollinger Bands", aliases: ["bollinger", "bands"], short: "Lines two standard deviations either side of a 20-day average. They widen with volatility.", lesson: "volatility-bands" },
  { term: "MACD", aliases: ["moving average convergence divergence"], short: "The gap between a 12-day and 26-day average, with a 9-day signal line. Shows momentum shifts.", lesson: "volatility-bands" },
  { term: "Market order", aliases: ["market orders"], short: "Buy or sell immediately at the best available price.", lesson: "order-types" },
  { term: "Limit order", aliases: ["limit", "limit orders"], short: "Only buy at your price or lower, or sell at your price or higher.", lesson: "order-types" },
  { term: "Stop-loss", aliases: ["stop loss", "stop", "stops", "stop order"], short: "An automatic sell if the price falls to a level you set.", lesson: "position-sizing" },
  { term: "Trailing stop", aliases: ["trailing"], short: "A stop that follows the price up, staying a set % below its highest point.", lesson: "position-sizing" },
  { term: "Position sizing", aliases: ["position size", "sizing", "risk per trade"], short: "Choosing how much to buy so a stop-loss hit costs only what you planned to risk.", lesson: "position-sizing" },
  { term: "Rebalancing", aliases: ["rebalance", "rebalanced"], short: "Trading back to your target mix after some holdings have grown faster than others.", lesson: "look-through" },
  { term: "Look-through", aliases: ["overlap", "lookthrough"], short: "Breaking funds into the companies they hold, to see your true exposure.", lesson: "look-through" },
  { term: "Short selling", aliases: ["short", "shorting", "shorts", "short sell"], short: "Selling borrowed shares, hoping to buy back cheaper. Losses are uncapped.", lesson: "short-selling" },
  { term: "Short squeeze", aliases: ["squeeze", "squeezed"], short: "A sharp rise as short sellers are forced to buy back, pushing the price even higher.", lesson: "squeezes" },
  { term: "Days to cover", aliases: ["dtc"], short: "Short interest divided by daily volume: how many days shorts would need to buy back.", lesson: "squeezes" },
  { term: "Put option", aliases: ["put", "puts", "option", "options"], short: "The right to sell at a fixed price before a date. The buyer's maximum loss is the premium.", lesson: "defined-risk" },
  { term: "FX fee", aliases: ["fx", "currency conversion", "foreign exchange"], short: "The charge for converting pounds to another currency when you buy overseas shares.", lesson: "fees-matter" },
  { term: "P&L", aliases: ["pnl", "profit and loss", "unrealised", "realised"], short: "Profit and loss. Unrealised is on paper; realised is locked in when you sell.", lesson: "risk-and-return" },
];

export function findTerm(text: string): Term | undefined {
  const s = ` ${text.toLowerCase().replace(/[^a-z0-9&% ]/g, " ")} `;
  let best: { t: Term; len: number } | undefined;
  for (const t of GLOSSARY) {
    for (const name of [t.term.toLowerCase(), ...t.aliases]) {
      if (s.includes(` ${name} `) && (!best || name.length > best.len)) best = { t, len: name.length };
    }
  }
  return best?.t;
}

export function getTerm(term: string): Term | undefined {
  const k = term.toLowerCase();
  return GLOSSARY.find((t) => t.term.toLowerCase() === k || t.aliases.includes(k));
}
