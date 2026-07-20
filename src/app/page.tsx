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
          <Link href="/pricing" className="hidden sm:inline rounded-lg px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-white hover:bg-ink-900">
            Pricing
          </Link>
          <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-white hover:bg-ink-900">
            Sign in
          </Link>
          <Link href="/scan" className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-rose-500">
            Start free
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-16 pb-12 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-900 bg-rose-950 px-3 py-1 text-xs font-semibold text-rose-300 mb-5">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-rose-400" /> The short-seller’s edge, in one app
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1]">
            Find the best stocks to short. <span className="text-rose-400">Risk small, win big.</span>
          </h1>
          <p className="mt-5 text-lg text-ink-300 leading-relaxed max-w-xl">
            Shortlist scans the market for stretched, rolling-over stocks, structures every idea with defined risk, and
            flags the crowded ones that could squeeze you — so your losses stay small and your winners run.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/scan" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-500">
              Start scanning free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-ink-700 px-5 py-3 text-sm font-semibold text-ink-200 hover:bg-ink-900">
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-500">No card required · works instantly in your browser</p>
        </div>

        {/* Product mock */}
        <HeroMock />
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
          The live scanner ranks the market; each setup breaks down the squeeze risk, catalyst and defined-risk structure.
        </p>
        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <figure className="rounded-2xl border border-ink-800 bg-ink-900 p-2 shadow-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/screenshots/scanner.png" alt="Shortlist scanner ranking short candidates" className="rounded-xl w-full" loading="lazy" />
            <figcaption className="px-3 py-3 text-sm text-ink-400">Ranked scanner — every name scored, with squeeze risk and risk:reward at a glance.</figcaption>
          </figure>
          <figure className="rounded-2xl border border-ink-800 bg-ink-900 p-2 shadow-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/screenshots/detail.png" alt="Shortlist setup detail with squeeze radar and structured trade" className="rounded-xl w-full" loading="lazy" />
            <figcaption className="px-3 py-3 text-sm text-ink-400">Setup detail — squeeze radar, catalyst countdown and the defined-risk trade.</figcaption>
          </figure>
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

function HeroMock() {
  const rows = [
    { sym: "COIN", name: "Coinbase", price: "$241.50", score: 78, sq: "EXTREME", sqTone: "text-rose-300 border-rose-800 bg-rose-950", rr: "£250 → £1,800" },
    { sym: "TSLA", name: "Tesla", price: "$248.10", score: 71, sq: "MODERATE", sqTone: "text-amber-300 border-amber-800 bg-amber-950", rr: "£250 → £1,150" },
    { sym: "SHOP", name: "Shopify", price: "$78.40", score: 64, sq: "LOW", sqTone: "text-emerald-300 border-emerald-800 bg-emerald-950", rr: "£250 → £980" },
  ];
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4 shadow-2xl">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="live-dot inline-block h-2 w-2 rounded-full bg-rose-400" />
        <span className="text-xs font-semibold text-ink-300">Live scanner</span>
        <span className="ml-auto rounded-full border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          LIVE data
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.sym} className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-950/60 p-3">
            <span className="hidden sm:flex h-6 w-6 items-center justify-center rounded-md bg-ink-800 text-[11px] font-bold text-ink-400">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white leading-none">
                {r.sym} <span className="ml-1 text-xs font-normal text-ink-400">{r.name}</span>
              </p>
              <p className="mt-1 font-mono text-xs text-ink-300">{r.price}</p>
            </div>
            <span className={`hidden sm:block rounded-lg border px-2 py-1 text-center text-[10px] font-bold ${r.sqTone}`}>{r.sq}</span>
            <span className="hidden md:block text-right text-xs font-semibold text-white w-28">{r.rr}</span>
            <span className="w-10 shrink-0 rounded-lg border border-rose-800 bg-rose-950 px-1 py-1 text-center text-base font-bold text-rose-300">{r.score}</span>
          </div>
        ))}
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
