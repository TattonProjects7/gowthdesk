import Link from "next/link";
import {
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Target,
  Sparkles,
  CalendarClock,
  Bell,
  BarChart3,
  Check,
  Wallet,
  LineChart,
  Receipt,
  Repeat,
  Layers,
} from "lucide-react";

// Public marketing landing page. The app itself lives at /scan.
export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/85 backdrop-blur px-5 sm:px-8 py-3.5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
            <TrendingDown className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Shortlist</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <Link href="/markets" className="hidden sm:inline rounded-lg px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-white hover:bg-ink-900">
            Markets
          </Link>
          <Link href="/pricing" className="hidden sm:inline rounded-lg px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-white hover:bg-ink-900">
            Pricing
          </Link>
          <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-white hover:bg-ink-900">
            Sign in
          </Link>
          <Link href="/portfolio" className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-rose-500">
            Open app
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-14 pb-12 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-900 bg-rose-950 px-3 py-1 text-xs font-semibold text-rose-300 mb-5">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-rose-400" /> Invest · trade · short — one app
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.08] tracking-tight">
            Invest smarter. <span className="text-rose-400">Short with defined risk.</span>
          </h1>
          <p className="mt-5 text-lg text-ink-300 leading-relaxed max-w-xl">
            UK and US shares, ETFs and crypto in one app: a practice portfolio with ISA and SIPP accounts, live charts with
            indicators, watchlists, price alerts, savings plans, one-tap rebalancing and look-through analytics — plus the
            asymmetric short-finder no one else has.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/portfolio" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-500">
              Open the app <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/markets" className="inline-flex items-center gap-2 rounded-xl border border-ink-700 px-5 py-3 text-sm font-semibold text-ink-200 hover:bg-ink-900">
              Browse markets
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-500">Free · £10,000 of virtual money to practise with · iPhone, Android and web</p>
        </div>

        {/* Phone mock-up with the real app */}
        <PhoneMock />
      </section>

      {/* Investing features */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-16">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-white">Everything a modern investing app should do</h2>
        <p className="mt-3 text-center text-ink-400 max-w-2xl mx-auto">The features people rely on at the big UK platforms, in one fast, clean app.</p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature icon={Wallet} title="Portfolio & accounts" body="One screen for your whole picture: general account, Stocks & Shares ISA and SIPP, cash, P&L, dividends and income." />
          <Feature icon={LineChart} title="Charts that mean something" body="1W to 1Y charts with moving averages, Bollinger Bands, RSI and MACD. Drag to see any day." />
          <Feature icon={Receipt} title="Deal ticket" body="Market, limit and stop orders, fractional from £1, stop-loss, take-profit and trailing stops. Top up without leaving the ticket." />
          <Feature icon={Repeat} title="Automate it" body="Savings plans weekly to monthly, AutoInvest for spare cash, model portfolios and one-click rebalancing to your targets." />
          <Feature icon={Layers} title="See what you really own" body="Look-through splits every ETF into the companies, sectors and regions inside it, and flags overlap." />
          <Feature icon={Bell} title="Alerts that reach you" body="Price alerts, order fills, stop triggers and dividends — as phone notifications, with Face ID / fingerprint app lock." />
        </div>
      </section>

      {/* Logos / trust line */}
      <section className="border-y border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-ink-400">
          <span className="font-mono">RSI</span>
          <span className="font-mono">Z-SCORE</span>
          <span className="font-mono">DAYS-TO-COVER</span>
          <span className="font-mono">SHORT INTEREST</span>
          <span className="font-mono">BORROW FEE</span>
          <span className="font-mono">BLACK–SCHOLES</span>
          <span className="font-mono">EXPECTANCY (R)</span>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-white">From idea to disciplined trade in three steps</h2>
        <div className="mt-10 grid sm:grid-cols-3 gap-5">
          <Step n={1} title="Scan" body="The whole market scored and ranked best-short-first — stretched, overbought, rolling over, high-volatility names rise to the top." />
          <Step n={2} title="Structure" body="Every idea comes pre-built with a tight stop and a far target, so you risk a small fixed amount to make a multiple of it." />
          <Step n={3} title="Track" body="Take a setup and watch the asymmetry play out live. Your expectancy in R tells you whether the edge actually pays." />
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-ink-800 bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white">Everything a serious short needs</h2>
          <p className="mt-3 text-center text-ink-400 max-w-2xl mx-auto">
            The metrics the pros pay for, framed to protect a retail trader — in one place.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Feature icon={ShieldAlert} title="Squeeze-risk radar" body="Scores crowding from short interest, days-to-cover and borrow fee. Flags the GME-style traps instead of selling them to you." accent />
            <Feature icon={ShieldCheck} title="Defined risk" body="Every idea risks a fixed amount. The stop caps the loss — that's the 'lose small'." />
            <Feature icon={Target} title="Asymmetric payoff" body="Targets are 3–8× the risk. One winner pays for several stops." />
            <Feature icon={Sparkles} title="AI dual thesis" body="A bear case AND a steel-manned bull case, so you see the strongest argument you're wrong before you commit." />
            <Feature icon={CalendarClock} title="Catalyst countdown" body="The next earnings or event as the trade's clock — and a flag when it's close." />
            <Feature icon={Bell} title="Real-time alerts" body="Get pinged when a tracked short hits target or stop, or a fresh A-grade setup appears." />
          </div>
        </div>
      </section>

      {/* Product screenshots */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-white">See it in action</h2>
        <p className="mt-3 text-center text-ink-400 max-w-2xl mx-auto">
          Your portfolio at a glance, every instrument in depth, and the short scanner when you want the other side of the trade.
        </p>
        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <Shot src="/screenshots/portfolio.png" alt="Shortlist portfolio overview with value chart, accounts and holdings" caption="Portfolio — value chart, accounts, P&L, income and holdings on one screen." />
          <Shot src="/screenshots/instrument.png" alt="Shortlist instrument page with chart, deal ticket and fund look-through" caption="Instrument — chart and indicators, deal ticket, alerts, sentiment and fund look-through." />
          <Shot src="/screenshots/scanner.png" alt="Shortlist scanner ranking short candidates" caption="Short scanner — every name scored, with squeeze risk and risk:reward at a glance." />
          <Shot src="/screenshots/detail.png" alt="Shortlist setup detail with squeeze radar and structured trade" caption="Setup detail — squeeze radar, catalyst countdown and the defined-risk trade." />
        </div>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-400 mb-2">And the part no one else has</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">The asymmetric short-finder</h2>
        </div>
      </section>

      {/* Squeeze spotlight */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-400 mb-2">The feature no one else frames right</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Don’t short into a squeeze.</h2>
          <p className="mt-4 text-ink-300 leading-relaxed">
            Most screeners show you the “most shorted” stocks as opportunities. That’s exactly how retail traders get run
            over. Shortlist inverts it: a crowded short is a <span className="text-rose-300">danger</span>, and we dock its
            score and warn you — while rewarding the clean, lightly-shorted setups that actually have room to fall.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-ink-200">
            {["Short interest as % of float", "Days-to-cover (how trapped shorts are)", "Borrow fee & hard-to-borrow flags"].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-rose-400" /> {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-900 bg-rose-950/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="flex items-center gap-2 font-semibold text-rose-300">
              <ShieldAlert className="h-5 w-5" /> Squeeze risk: EXTREME
            </p>
            <p className="text-2xl font-bold text-rose-300">82<span className="text-xs text-ink-500">/100</span></p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Short int." value="11.5%" />
            <MiniStat label="Days to cover" value="4.8" />
            <MiniStat label="Borrow fee" value="8.5%" />
          </div>
          <p className="mt-4 text-sm text-ink-300">
            Crowded short — one rally could force a violent squeeze. Stand aside, or express it with a defined-risk put.
          </p>
        </div>
      </section>

      {/* Asymmetric spotlight */}
      <section className="border-t border-ink-800 bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 rounded-2xl border border-ink-800 bg-ink-900 p-6">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-emerald-400 font-semibold">target $190</span>
              <span className="text-ink-400">entry $241</span>
              <span className="text-rose-400 font-semibold">stop $255</span>
            </div>
            <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-500/70 via-ink-700 to-rose-500/70">
              <div className="absolute -top-1.5 h-6 w-1 rounded-full bg-white ring-2 ring-ink-950" style={{ left: "32%" }} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <BigStat label="Max loss" value="−£250" tone="rose" />
              <BigStat label="Max gain" value="+£1,800" tone="emerald" />
              <BigStat label="Reward:risk" value="7.2:1" tone="white" />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-rose-400 mb-2">The whole point</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Lose small. Win big. Every time.</h2>
            <p className="mt-4 text-ink-300 leading-relaxed">
              Each suggestion is pre-structured so the downside is a small fixed number and the upside is a multiple of it.
              Prefer truly capped risk? One click shows the equivalent <span className="text-sky-300">put</span> — loss
              limited to the premium, no margin call, no forced cover.
            </p>
            <Link href="/scan" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-500">
              See today’s top setups <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-4xl px-5 sm:px-8 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Start free. Upgrade when it pays for itself.</h2>
        <p className="mt-3 text-ink-400">The scanner, squeeze radar and tracker are free forever. Pro adds the AI thesis, put structures and cross-device alerts.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/scan" className="inline-flex items-center gap-2 rounded-xl border border-ink-700 px-5 py-3 text-sm font-semibold text-ink-200 hover:bg-ink-900">
            Use it free
          </Link>
          <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-500">
            See Pro — £12/mo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 inline-flex items-center gap-2 text-sm text-ink-400">
          <BarChart3 className="h-4 w-4 text-rose-400" /> Track your expectancy in R and prove the edge is real.
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-800">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white">
                <TrendingDown className="h-4 w-4" />
              </div>
              <span className="font-bold text-white">Shortlist</span>
            </Link>
            <div className="flex flex-wrap items-center gap-5 text-sm text-ink-400">
              <Link href="/scan" className="hover:text-white">Scanner</Link>
              <Link href="/pricing" className="hover:text-white">Pricing</Link>
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms</Link>
              <Link href="/login" className="hover:text-white">Sign in</Link>
            </div>
          </div>
          <p className="mt-6 text-xs text-ink-600 leading-relaxed max-w-3xl">
            Educational research tool, not investment advice. Shortlist does not execute trades. Short selling carries
            uncapped risk unless a hard stop or defined-risk instrument is used. Market figures shown on this page are
            illustrative.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Shot({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="rounded-2xl border border-ink-800 bg-ink-900 p-2 shadow-2xl overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="rounded-xl w-full" loading="lazy" />
      <figcaption className="px-3 py-3 text-sm text-ink-400">{caption}</figcaption>
    </figure>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      <div className="absolute -inset-10 rounded-full bg-rose-600/20 blur-3xl" aria-hidden />
      <div className="relative rounded-[3rem] border border-ink-700 bg-black p-2.5 shadow-2xl">
        <div className="overflow-hidden rounded-[2.4rem] bg-ink-950">
          {/* status bar with the camera island */}
          <div className="relative flex h-9 items-center justify-between px-7 text-[11px] font-semibold text-white">
            <span>9:41</span>
            <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden />
            <span className="tracking-tight">5G ▮▮▮</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/screenshots/mobile-portfolio.png" alt="Shortlist on iPhone: portfolio value, chart and quick actions" className="block w-full" />
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white font-bold">{n}</div>
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-ink-400 leading-relaxed">{body}</p>
    </div>
  );
}

function Feature({ icon: Icon, title, body, accent }: { icon: React.ElementType; title: string; body: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-rose-900 bg-rose-950/20" : "border-ink-800 bg-ink-900"}`}>
      <Icon className={`h-6 w-6 mb-3 ${accent ? "text-rose-400" : "text-ink-300"}`} />
      <h3 className="font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-ink-400 leading-relaxed">{body}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950/40 p-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 font-mono font-bold text-white">{value}</p>
    </div>
  );
}

function BigStat({ label, value, tone }: { label: string; value: string; tone: "rose" | "emerald" | "white" }) {
  const c = tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${c}`}>{value}</p>
    </div>
  );
}
