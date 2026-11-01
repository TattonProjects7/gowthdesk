"use client";

import AdSlot from "@/components/ads/AdSlot";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BellPlus, BellRing, Check, Layers, Newspaper, Plus, Radar, Sparkles, Star, Trash2, Users, X } from "lucide-react";
import Nav from "@/components/Nav";
import PriceChart, { TIMEFRAMES, type Timeframe } from "@/components/PriceChart";
import TradeTicket from "@/components/TradeTicket";
import Avatar from "@/components/Avatar";
import DigestCard from "@/components/DigestCard";
import QuoteSnapshot from "@/components/screener/QuoteSnapshot";
import ExplainTerm from "@/components/ExplainTerm";
import { useCoach } from "@/components/coach/CoachProvider";
import type { DigestInput } from "@/lib/ai/types";
import { ChangePill, usePriceFlash } from "@/components/InstrumentRow";
import { Button, Card, H2, Input, Pill, Pct, Segmented, Select, Stat } from "@/components/ui";
import { useMarket, useLiveFocus } from "@/lib/useMarket";
import { FreshnessBadge } from "@/components/LiveBadge";
import { describeSession, marketFor, sessionAt } from "@/lib/sessions";
import { getInstrument, fmtNative, fmtGbp } from "@/lib/instruments";
import { makePricer, usePortfolio } from "@/lib/portfolioStore";
import type { OrderSide, Pricer } from "@/lib/portfolio";
import { valueHoldings } from "@/lib/portfolio";
import { toGbp } from "@/lib/fx";
import { computeSignals } from "@/lib/signals";
import { maxDrawdown, pctChange } from "@/lib/indicators";
import { clientSentiment } from "@/lib/sentiment";
import { nextCatalyst, fmtDate } from "@/lib/catalysts";
import { researchNotes, type NewsItem } from "@/lib/news";
import { useWatchlists, toggleSymbol, listsContaining } from "@/lib/watchlists";
import { addPriceAlert, describeAlert, removePriceAlert, resetPriceAlert, usePriceAlerts, type PriceAlertKind } from "@/lib/pricealerts";

// Instrument page: chart with indicators, key stats, deal ticket, watchlist and
// price-alert controls, client sentiment, fund look-through, news & research.
export default function InstrumentPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol || "").toUpperCase();
  const i = getInstrument(symbol);
  const { mounted, source, now, priceFor, closesFor, freshness, isLive } = useMarket();
  useLiveFocus(i ? [i.symbol] : []);
  const [tf, setTf] = useState<Timeframe>("3M");
  const state = usePortfolio();

  const pricer = useMemo(() => makePricer(now, priceFor, closesFor), [now, priceFor, closesFor]);
  const price = mounted && i ? priceFor(symbol) : 0;
  const days = TIMEFRAMES.find((t) => t.id === tf)!.days;
  const closes = useMemo(() => (mounted && i ? closesFor(symbol, days) : []), [mounted, i, symbol, days, closesFor]);
  const closes31 = useMemo(() => (mounted && i ? closesFor(symbol, 31) : []), [mounted, i, symbol, closesFor]);
  const flash = usePriceFlash(price);
  const dayChg = closes31.length >= 2 && closes31[closes31.length - 2] ? (price / closes31[closes31.length - 2] - 1) * 100 : 0;
  const signals = useMemo(() => (closes31.length ? computeSignals(closes31) : null), [closes31]);
  const coach = useCoach();
  // Inputs for the "why it's moving" digest — computed once the market is live.
  const digestInput = useMemo<DigestInput | null>(() => {
    if (!mounted || !i || !signals || !now) return null;
    return {
      symbol: i.symbol,
      name: i.name,
      type: i.type,
      currency: i.currency,
      price,
      dayChangePct: dayChg,
      trend30Pct: signals.trend30,
      rsi: signals.rsi,
      zscore: signals.zscore,
      dailyVolPct: signals.volatility * 100,
      aboveTrend: !signals.belowShortMa,
      sentimentLongPct: clientSentiment(i.symbol, dayChg, now).longPct,
      catalyst: i.type === "stock" ? nextCatalyst(i.symbol, now).note : undefined,
      headlines: [],
    };
    // Recompute when the symbol changes or the market first loads, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, i?.symbol, Boolean(signals), Boolean(now)]);
  const held = useMemo(() => (mounted && i ? valueHoldings(state, pricer).filter((h) => h.symbol === symbol) : []), [mounted, i, state, pricer, symbol]);

  if (!i) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-ink-300">No coverage for “{symbol}”.</p>
          <Link href="/markets" className="mt-4 inline-block text-rose-400 hover:underline">
            ← Back to markets
          </Link>
        </main>
      </div>
    );
  }

  const tone = i.type === "etf" ? "sky" : i.type === "crypto" ? "amber" : i.region === "UK" ? "violet" : "ink";

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 sm:px-8 py-6">
        <Link href="/markets" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4" /> Markets
        </Link>

        {/* Header: logo, name, live price and today's move */}
        <div className="mb-5 flex items-start gap-3.5">
          <Avatar symbol={i.symbol} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">{i.name}</h1>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-xs text-ink-400">
              <span className="font-semibold text-ink-300">{i.symbol}</span>
              <Pill tone={tone}>{i.type === "etf" ? "ETF" : i.type === "crypto" ? "Crypto" : i.exchange}</Pill>
              <Pill>{i.currency === "GBX" ? "pence" : i.currency}</Pill>
              {i.shortable && (
                <Link href={`/short/${i.symbol}`} className="inline-flex items-center gap-1 rounded-md border border-rose-900 bg-rose-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300 hover:bg-rose-900">
                  <Radar className="h-3 w-3" /> short setup
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={`inline-block font-mono text-[40px] leading-none font-semibold tracking-tight text-white rounded-lg px-1 -mx-1 ${flash}`}>{mounted ? fmtNative(price, i.currency) : "…"}</p>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {mounted && <ChangePill v={dayChg} size="md" />}
              <span className="text-ink-500">today</span>
              {mounted && i.currency !== "GBP" && <span className="font-mono text-ink-500">· ≈ {fmtGbp(toGbp(price, i.currency, now))}</span>}
              {mounted && <FreshnessBadge f={freshness(i.symbol)} className="ml-1" />}
            </div>
            {mounted && now > 0 && <p className="mt-1 text-xs text-ink-500">{sessionAt(marketFor(i), now).label} · {describeSession(sessionAt(marketFor(i), now), now)}</p>}
          </div>
          <div className="max-w-md">
            <p className="text-sm text-ink-400">{i.description}</p>
            <button onClick={() => coach.open(`Explain ${i.name} (${i.symbol}) to me like I'm new to investing`)} className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-200 hover:bg-blue-500/25">
              <Sparkles className="h-3.5 w-3.5" /> Ask the coach about {i.symbol}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-5">
          <div className="min-w-0">
            {/* Chart */}
            <div className="flex items-center justify-between mb-2">
              <Segmented size="sm" options={TIMEFRAMES.map((t) => ({ id: t.id, label: t.id }))} value={tf} onChange={setTf} />
              {closes.length > 1 && (
                <span className="text-xs text-ink-400">
                  {tf}: <Pct v={pctChange(closes)} />
                </span>
              )}
            </div>
            {mounted ? <PriceChart closes={closes} currency={i.currency} now={now} /> : <div className="h-64 rounded-xl border border-white/[0.07] bg-ink-900/70 shadow-card animate-pulse" />}

            {/* Key stats */}
            {signals && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label={`${tf} high`} value={fmtNative(Math.max(...closes), i.currency)} />
                <Stat label={`${tf} low`} value={fmtNative(Math.min(...closes), i.currency)} />
                <Stat label={<ExplainTerm term="Drawdown">Max drawdown</ExplainTerm>} value={`${maxDrawdown(closes).toFixed(1)}%`} tone="rose" sub={`over ${tf}`} />
                <Stat label={<ExplainTerm term="Volatility">Daily volatility</ExplainTerm>} value={`${(signals.volatility * 100).toFixed(1)}%`} sub="14-day σ" />
                <Stat label={<ExplainTerm term="RSI">RSI (14)</ExplainTerm>} value={signals.rsi.toFixed(0)} tone={signals.rsi >= 70 ? "rose" : signals.rsi <= 30 ? "emerald" : "white"} sub={signals.rsi >= 70 ? "overbought" : signals.rsi <= 30 ? "oversold" : "neutral"} />
                <Stat label={<ExplainTerm term="Dividend yield">Dividend yield</ExplainTerm>} value={`${i.dividendYieldPct.toFixed(1)}%`} sub={i.type === "etf" ? `OCF ${i.ocfPct?.toFixed(2)}%` : i.dividendYieldPct ? "trailing" : "no dividend"} />
                <Stat label="Sector" value={<span className="text-sm">{i.sector}</span>} sub={i.region} />
                <Stat label="Trend" value={<span className="text-sm">{signals.belowShortMa ? "10d < 30d" : "10d > 30d"}</span>} tone={signals.belowShortMa ? "rose" : "emerald"} sub={signals.belowShortMa ? "bearish" : "bullish"} />
              </div>
            )}

            {/* AI: why it's moving */}
            <DigestCard input={digestInput} />

            {/* Finviz-style snapshot: pattern with trendlines, 50 key stats, peers */}
            <QuoteSnapshot symbol={i.symbol} />

            {/* Your position */}
            {held.length > 0 && (
              <>
                <H2>Your position</H2>
                <div className="space-y-2">
                  {held.map((h) => {
                    const acc = state.accounts.find((a) => a.id === h.accountId);
                    return (
                      <Card key={h.id} className="flex flex-wrap items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{acc?.name}</p>
                          <p className="text-xs text-ink-400">
                            {h.qty.toLocaleString(undefined, { maximumFractionDigits: 6 })} units · avg {fmtGbp(h.avgCost)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-white">{fmtGbp(h.valueGbp)}</p>
                          <p className="text-xs">
                            <span className={h.pnlGbp >= 0 ? "text-emerald-400" : "text-rose-400"}>
                              {fmtGbp(h.pnlGbp, { sign: true })} ({h.pnlPct >= 0 ? "+" : ""}
                              {h.pnlPct.toFixed(1)}%)
                            </span>
                          </p>
                        </div>
                        <Link href="/portfolio?tab=holdings" className="text-xs text-rose-400 hover:underline">
                          Manage
                        </Link>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {/* Sentiment */}
            {mounted && <SentimentCard symbol={i.symbol} dayChg={dayChg} now={now} />}

            {/* Catalyst */}
            {i.type === "stock" && mounted && <CatalystLine symbol={i.symbol} now={now} />}

            {/* Look-through for ETFs */}
            {i.type === "etf" && i.holdings && (
              <>
                <H2>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-4 w-4" /> What this fund holds
                  </span>
                </H2>
                <Card>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-xs font-semibold text-ink-400 mb-2">Top holdings</p>
                      <ul className="space-y-1.5 text-sm">
                        {i.holdings.map((h) => (
                          <li key={h.name} className="flex items-center justify-between gap-2">
                            {h.symbol ? (
                              <Link href={`/i/${h.symbol}`} className="text-ink-200 hover:text-white hover:underline truncate">
                                {h.name}
                              </Link>
                            ) : (
                              <span className="text-ink-200 truncate">{h.name}</span>
                            )}
                            <span className="font-mono text-ink-300">{h.pct.toFixed(1)}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <Bars title="Sectors" rows={i.sectors ?? []} />
                      <Bars title="Regions" rows={i.regions ?? []} />
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* News & research */}
            <NewsSection symbol={i.symbol} closes={closes31} now={now} mounted={mounted} />

            {/* Web only, well below the deal ticket; never in real-money mode. */}
            <AdSlot placement="quote-bottom" />
          </div>

          {/* Side column: deal ticket, watchlist, alerts */}
          <aside className="space-y-4 lg:sticky lg:top-20 self-start">
            <div className="hidden lg:block">{mounted ? <TradeTicket symbol={i.symbol} pricer={pricer} priceLive={isLive(i.symbol)} /> : <div className="h-96 rounded-3xl border border-white/[0.07] bg-ink-900/70 shadow-card animate-pulse" />}</div>
            <WatchlistCard symbol={i.symbol} />
            {mounted && <PriceAlertCard symbol={i.symbol} price={price} currency={i.currency} />}
          </aside>
        </div>

        {mounted && <MobileTradeBar symbol={i.symbol} pricer={pricer} priceLive={isLive(i.symbol)} />}

        <p className="mt-10 text-center text-xs text-ink-600 max-w-xl mx-auto leading-relaxed">
          Paper trading with {isLive(i.symbol) ? "real" : "simulated"} prices. Not investment advice. Capital at risk when investing for real.
        </p>
      </main>
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: { name: string; pct: number }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-400 mb-2">{title}</p>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.name} className="text-xs">
            <div className="flex justify-between text-ink-300">
              <span>{r.name}</span>
              <span className="font-mono">{r.pct}%</span>
            </div>
            <div className="mt-0.5 h-1.5 rounded-full bg-ink-800">
              <div className="h-1.5 rounded-full bg-sky-500/70" style={{ width: `${Math.min(100, r.pct)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SentimentCard({ symbol, dayChg, now }: { symbol: string; dayChg: number; now: number }) {
  const s = clientSentiment(symbol, dayChg, now);
  return (
    <>
      <H2>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Client sentiment
        </span>
      </H2>
      <Card>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-emerald-300">{s.longPct}% long</span>
          <span className="text-ink-300">{s.label}</span>
          <span className="font-semibold text-rose-300">{s.shortPct}% short</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-emerald-500" style={{ width: `${s.longPct}%` }} />
          <div className="bg-rose-500" style={{ width: `${s.shortPct}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-400">{s.contrarian} Sentiment is modelled, not live order flow.</p>
      </Card>
    </>
  );
}

function CatalystLine({ symbol, now }: { symbol: string; now: number }) {
  const c = nextCatalyst(symbol, now);
  return (
    <Card className={`mt-4 ${c.imminent ? "border-amber-900 bg-amber-950/20" : ""}`}>
      <p className="text-sm text-white font-semibold">
        Next event: {c.type} · {fmtDate(c.date)} ({c.daysUntil}d)
      </p>
      <p className="text-xs text-ink-400 mt-0.5">{c.note}</p>
    </Card>
  );
}

function WatchlistCard({ symbol }: { symbol: string }) {
  const lists = useWatchlists();
  const inLists = listsContaining(lists, symbol);
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const target = lists.find((l) => l.id === listId) ?? lists[0];
  const watched = target ? target.symbols.includes(symbol) : false;
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
          <Star className={`h-4 w-4 ${inLists.length ? "fill-amber-400 text-amber-400" : "text-ink-400"}`} /> Watchlist
        </p>
        <span className="text-xs text-ink-500">{inLists.length ? `In ${inLists.map((l) => l.name).join(", ")}` : "Not watched"}</span>
      </div>
      <div className="flex gap-2">
        {lists.length > 1 && (
          <Select value={target?.id} onChange={(e) => setListId(e.target.value)}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        )}
        <Button variant={watched ? "ghost" : "primary"} onClick={() => target && toggleSymbol(target.id, symbol)} className="whitespace-nowrap flex-1">
          {watched ? (
            <>
              <Check className="h-4 w-4" /> Watching
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function PriceAlertCard({ symbol, price, currency }: { symbol: string; price: number; currency: "USD" | "GBP" | "GBX" }) {
  const alerts = usePriceAlerts().filter((a) => a.symbol === symbol);
  const [kind, setKind] = useState<PriceAlertKind>("above");
  const [value, setValue] = useState("");
  const isPct = kind === "pct_up" || kind === "pct_down";
  const add = () => {
    const v = parseFloat(value);
    if (!(v > 0)) return;
    addPriceAlert(symbol, kind, v);
    setValue("");
  };
  return (
    <Card>
      <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5 mb-2">
        <BellPlus className="h-4 w-4 text-amber-400" /> Price alerts
      </p>
      <div className="flex gap-2">
        <Select value={kind} onChange={(e) => setKind(e.target.value as PriceAlertKind)} className="!w-auto">
          <option value="above">Rises above</option>
          <option value="below">Falls below</option>
          <option value="pct_up">Up % today</option>
          <option value="pct_down">Down % today</option>
        </Select>
        <Input type="number" step="any" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={isPct ? "5" : fmtNative(price, currency).replace(/[£$p]/g, "")} />
        <Button onClick={add} disabled={!(parseFloat(value) > 0)}>
          Set
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-500">Alerts fire in-app and as a notification if you’ve allowed them (bell icon → enable).</p>
      {alerts.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-xs">
              <BellRing className={`h-3.5 w-3.5 shrink-0 ${a.triggeredAt ? "text-emerald-400" : "text-amber-400"}`} />
              <span className={`flex-1 ${a.triggeredAt ? "text-ink-400 line-through" : "text-ink-200"}`}>{describeAlert(a)}</span>
              {a.triggeredAt && (
                <button onClick={() => resetPriceAlert(a.id)} className="text-ink-400 hover:text-white" title="Re-arm">
                  re-arm
                </button>
              )}
              <button onClick={() => removePriceAlert(a.id)} className="text-ink-500 hover:text-rose-400" aria-label="Remove alert">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NewsSection({ symbol, closes, now, mounted }: { symbol: string; closes: number[]; now: number; mounted: boolean }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [src, setSrc] = useState<"none" | "finnhub">("none");
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/news?symbol=${symbol}`)
      .then((r) => r.json())
      .then((j: { source: "none" | "finnhub"; items: Omit<NewsItem, "kind">[] }) => {
        if (cancelled) return;
        setSrc(j.source);
        setItems((j.items ?? []).map((n) => ({ ...n, kind: "news" as const })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [symbol]);
  const research = useMemo(() => (mounted ? researchNotes(symbol, closes, now) : []), [mounted, symbol, closes, now]);
  const all = [...items, ...research];
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? all : all.slice(0, 4);
  return (
    <>
      <H2
        right={
          <span className="text-xs text-ink-500">{src === "finnhub" ? "Headlines via Finnhub + auto research" : "Auto research from live signals"}</span>
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <Newspaper className="h-4 w-4" /> News & research
        </span>
      </H2>
      <div className="space-y-2">
        {shown.map((n) => (
          <Card key={n.id} className="!p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {n.url ? (
                  <a href={n.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-white hover:underline">
                    {n.headline}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-white">{n.headline}</p>
                )}
                <p className="mt-1 text-sm text-ink-400 leading-relaxed">{n.summary}</p>
              </div>
              <Pill tone={n.kind === "news" ? "sky" : "violet"}>{n.kind === "news" ? n.source : "research"}</Pill>
            </div>
          </Card>
        ))}
        {all.length > 4 && (
          <button onClick={() => setShowAll((v) => !v)} className="text-xs text-rose-400 hover:underline">
            {showAll ? "Show less" : `Show ${all.length - 4} more`}
          </button>
        )}
      </div>
    </>
  );
}

// Phones: a sticky Sell / Buy bar above the tab bar that opens the deal ticket
// as a bottom sheet — the IG / Trading-app pattern.
function MobileTradeBar({ symbol, pricer, priceLive }: { symbol: string; pricer: Pricer; priceLive: boolean }) {
  const [side, setSide] = useState<OrderSide | null>(null);
  useEffect(() => {
    if (!side) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [side]);
  return (
    <>
      <div className="lg:hidden fixed inset-x-0 z-30 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] sm:bottom-0 border-t border-ink-800 bg-ink-950/95 backdrop-blur px-4 py-2.5">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2.5">
          <button onClick={() => setSide("sell")} className="rounded-2xl bg-ink-800 py-3 text-sm font-bold text-rose-300 active:scale-[0.98] transition-transform">
            Sell
          </button>
          <button onClick={() => setSide("buy")} className="rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 py-3 text-sm font-bold text-ink-950 shadow-glow-emerald active:scale-[0.98] transition-transform">
            Buy {symbol}
          </button>
        </div>
      </div>
      <div className="lg:hidden h-16" aria-hidden />
      {side && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button className="absolute inset-0 bg-black/60 fade-in" aria-label="Close" onClick={() => setSide(null)} />
          <div className="sheet-up relative max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-ink-700 bg-ink-950 px-3 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink-700" />
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-white">Deal ticket · {symbol}</p>
              <button onClick={() => setSide(null)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <TradeTicket key={side} symbol={symbol} pricer={pricer} defaultSide={side} compact priceLive={priceLive} />
          </div>
        </div>
      )}
    </>
  );
}
