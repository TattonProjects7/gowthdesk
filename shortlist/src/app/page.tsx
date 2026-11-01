import BrandMark from "@/components/BrandMark";
import Link from "next/link";
import {
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
  GraduationCap,
  Bot,
  Gift,
  HeartPulse,
  Trophy,
  Newspaper,
} from "lucide-react";

// Public marketing landing page. The app itself lives at /scan.
export default function Landing() {
  return (
    <div className="min-h-screen text-ink-100">
      {/* Header */}
      <header className="glass sticky top-0 z-30 border-b border-white/[0.06] px-5 sm:px-8 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size={36} className="shadow-glow-violet rounded-[10px]" />
          <span className="font-bold text-lg tracking-tight text-white">Shortlist</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1.5">
          <Link href="/markets" className="hidden sm:inline rounded-full px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-white hover:bg-white/[0.05]">
            Markets
          </Link>
          <Link href="/pricing" className="hidden sm:inline rounded-full px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-white hover:bg-white/[0.05]">
            Pricing
          </Link>
          <Link href="/login" className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-white hover:bg-white/[0.05]">
            Sign in
          </Link>
          <Link href="/portfolio" className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink-950 shadow-[0_8px_24px_-10px_rgba(255,255,255,0.6)] transition-transform active:scale-[0.98]">
            Open app
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-14 sm:pt-20 pb-12 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(232,121,249,0.18),transparent)] blur-2xl" aria-hidden />
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-ink-200 mb-6 backdrop-blur">
            <span className="rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-1.5 py-px text-[10px] font-bold uppercase text-ink-950">New</span>
            Demo and real modes · trade for real with Trading 212
          </div>
          <h1 className="text-[42px] sm:text-6xl font-bold text-white leading-[1.02] tracking-[-0.035em]">
            Investing that&apos;s <span className="text-gradient">actually fun.</span>
          </h1>
          <p className="mt-6 text-lg text-ink-300 leading-relaxed max-w-xl">
            Practise free with £10,000 of demo money, learn in two-minute lessons with an AI coach, then switch to real mode and
            trade your own Trading 212 account. Confetti when you buy, cash when you sell.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/portfolio" className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow-rose transition-transform active:scale-[0.98]">
              Start free in demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/learn" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-ink-100 hover:bg-white/[0.07]">
              Try a 2-minute lesson
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-400">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Free demo, no sign-up</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> iPhone, Android and web</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> ISA, SIPP and GIA</span>
          </div>
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

      {/* Learn + AI coach */}
      <section className="border-t border-ink-800 bg-gradient-to-b from-violet-950/30 to-transparent">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-300 mb-2">Learn by doing</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">An academy and an AI coach in your pocket</h2>
            <p className="mt-4 text-ink-300 leading-relaxed max-w-xl">
              Two-minute lessons, quizzes and live calculators teach you as you go. Ask the AI coach about anything on screen
              and get a plain-English answer with the lesson that goes deeper. It explains. It never tells you what to buy.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              <Feature icon={GraduationCap} title="Shortlist Academy" body="19 bite-sized lessons in six paths, from your first share to ISAs, charts and defined-risk shorts." />
              <Feature icon={Bot} title="AI coach" body="Sees the instrument, portfolio or lesson you are on, so answers are about you, not generic." />
              <Feature icon={Trophy} title="Learn & Earn" body="XP, levels, streaks and badges, plus practice cash for every lesson. You earn by learning, not by trading." />
              <Feature icon={Gift} title="Free practice share" body="Pick a card to reveal a free share for your practice portfolio." />
              <Feature icon={Newspaper} title="Why it's moving" body="A daily AI digest on every instrument and a 60-second brief on your portfolio." />
              <Feature icon={HeartPulse} title="Health score" body="Your portfolio scored out of 100, with the lesson that fixes each weak spot." />
            </div>
          </div>
          <div className="mx-auto w-full max-w-[300px]">
            <div className="rounded-[2.6rem] border border-ink-700 bg-ink-950 p-2.5 shadow-2xl shadow-violet-950/50">
              <div className="overflow-hidden rounded-[2.1rem] border border-ink-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/screenshots/mobile-learn.webp" alt="Shortlist Academy on iPhone: level, streak, next lesson and AI coach" className="block w-full" loading="lazy" />
              </div>
            </div>
          </div>
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
          <Shot src="/screenshots/portfolio.webp" alt="Shortlist portfolio overview with value chart, accounts and holdings" caption="Portfolio — value chart, accounts, P&L, income and holdings on one screen." />
          <Shot src="/screenshots/instrument.webp" alt="Shortlist instrument page with chart, deal ticket and fund look-through" caption="Instrument — chart and indicators, deal ticket, alerts, sentiment and fund look-through." />
          <Shot src="/screenshots/scanner.webp" alt="Shortlist scanner ranking short candidates" caption="Short scanner — every name scored, with squeeze risk and risk:reward at a glance." />
          <Shot src="/screenshots/detail.webp" alt="Shortlist setup detail with squeeze radar and structured trade" caption="Setup detail — squeeze radar, catalyst countdown and the defined-risk trade." />
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
          <div className="order-2 lg:order-1 rounded-2xl border border-white/[0.07] bg-ink-900/70 shadow-card p-6">
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
            <Link href="/scan" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand shadow-glow-rose px-5 py-3 text-sm font-semibold text-white hover:brightness-110">
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
          <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-brand shadow-glow-rose px-5 py-3 text-sm font-semibold text-white hover:brightness-110">
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
              <BrandMark size={28} className="rounded-lg" />
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
            Not investment advice. Shortlist is not a broker: demo mode uses virtual money, and real-mode orders are executed and held by your own Trading 212 account. Capital at risk. Short selling carries
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
    <figure className="rounded-2xl border border-white/[0.07] bg-ink-900/70 shadow-card p-2 shadow-2xl overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="rounded-xl w-full" loading="lazy" />
      <figcaption className="px-3 py-3 text-sm text-ink-400">{caption}</figcaption>
    </figure>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      <div className="absolute -inset-12 rounded-full bg-gradient-to-br from-rose-500/30 via-fuchsia-500/20 to-violet-600/30 blur-3xl" aria-hidden />
      <div className="relative animate-float">
        <div className="relative rounded-[3rem] border border-white/15 bg-black p-2.5 shadow-[0_40px_120px_-30px_rgba(139,92,246,0.55)]">
          <div className="overflow-hidden rounded-[2.4rem] bg-ink-950">
            {/* status bar with the camera island */}
            <div className="relative flex h-9 items-center justify-between px-7 text-[11px] font-semibold text-white">
              <span>9:41</span>
              <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden />
              <span className="tracking-tight">5G ▮▮▮</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/screenshots/mobile-portfolio.webp" alt="Shortlist on iPhone: portfolio value, chart and quick actions" className="block w-full" />
          </div>
        </div>
        {/* Floating chips */}
        <div className="absolute -left-14 top-24 hidden sm:flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/90 px-3 py-2 shadow-2xl backdrop-blur" aria-hidden>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 text-ink-950">
            <Check className="h-4 w-4" />
          </span>
          <span className="text-left">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Order filled</span>
            <span className="block text-sm font-bold text-white">+£250 VWRL 🎉</span>
          </span>
        </div>
        <div className="absolute -right-12 top-1/2 hidden sm:block rounded-2xl border border-white/10 bg-ink-900/90 px-3 py-2 shadow-2xl backdrop-blur" aria-hidden>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-amber-300">Cash in!</span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-white"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-[11px] font-black text-amber-900">£</span>+£180.40</span>
        </div>
        <div className="absolute -left-8 bottom-16 hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/90 px-3 py-1.5 shadow-2xl backdrop-blur" aria-hidden>
          <span className="text-base">🔥</span>
          <span className="text-xs font-semibold text-white">5-day streak · Level 4</span>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-ink-900/70 shadow-card p-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white shadow-glow-rose font-bold">{n}</div>
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
