"use client";

import AdSlot from "@/components/ads/AdSlot";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Bell, BellOff, Check, Download, Link2, Loader2, Pause, Play, RotateCcw, Save, Scale, Sparkles, Star, Trash2, Wand2, X } from "lucide-react";
import Nav from "@/components/Nav";
import Avatar from "@/components/Avatar";
import MarketsTabs, { DataBadges } from "@/components/screener/MarketsTabs";
import MiniCandles from "@/components/screener/MiniCandles";
import { Card, Segmented } from "@/components/ui";
import { useScreener } from "@/lib/screener/useScreener";
import { FILTERS, PRESETS, SIGNALS, getFilter, runScreen, tokenLabel, type FilterGroup } from "@/lib/screener/filters";
import { COLUMNS, CUSTOM_DEFAULT, VIEWS, getColumn, sortSnaps, toCsv, type ViewId } from "@/lib/screener/columns";
import { ColumnPicker, CompareSheet, Pager, StatsPanel, TickerCloud } from "@/components/screener/ScreenerViews";
import { deleteScreen, saveScreen, screenToQuery, setScreenAlert, useSavedScreens } from "@/lib/screener/screens";
import { parseScreenOffline, type ParsedScreen } from "@/lib/screener/nlp";
import { toggleSymbol, useWatchlists } from "@/lib/watchlists";
import { fmtNative } from "@/lib/instruments";
import type { SignalId, Snapshot } from "@/lib/screener/snapshot";

const GROUPS: { id: FilterGroup | "all"; label: string }[] = [
  { id: "descriptive", label: "Descriptive" },
  { id: "fundamental", label: "Fundamental" },
  { id: "technical", label: "Technical" },
  { id: "all", label: "All" },
];

const PAGE = 20;
const CUSTOM_KEY = "shortlist.screener.columns.v1";

export default function Screener() {
  const params = useSearchParams();
  const router = useRouter();
  const { mounted, source, fund, coverage, snaps } = useScreener();

  // The screen lives in the URL, so it survives a refresh and can be shared.
  const filters = useMemo(() => (params.get("f") ?? "").split(",").filter((t) => t && tokenLabel(t)), [params]);
  const signal = (params.get("s") ?? "") as SignalId | "";
  const sort = params.get("o") ?? "-cap";
  const view = (VIEWS.some((v) => v.id === params.get("v")) ? params.get("v") : "overview") as ViewId;
  const tickers = useMemo(() => (params.get("t") ?? "").split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter(Boolean).slice(0, 50), [params]);

  const [group, setGroup] = useState<FilterGroup | "all">("descriptive");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [live, setLive] = useState(true);
  const frozen = useRef<Snapshot[] | null>(null);
  const [tickerText, setTickerText] = useState("");
  const [custom, setCustom] = useState<string[]>(CUSTOM_DEFAULT);
  useEffect(() => {
    setTickerText(tickers.join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (raw) setCustom((JSON.parse(raw) as string[]).filter((c) => getColumn(c)));
    } catch {
      /* private mode: keep the defaults */
    }
  }, []);
  const saveCustom = (cols: string[]) => {
    setCustom(cols);
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(cols));
    } catch {
      /* ignore */
    }
  };
  const [ask, setAsk] = useState("");
  const [asking, setAsking] = useState(false);
  const [explain, setExplain] = useState<ParsedScreen | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(
    (next: { filters?: string[]; signal?: string; sort?: string; view?: string; tickers?: string[] }) => {
      const q = screenToQuery({ filters: next.filters ?? filters, signal: next.signal ?? signal, sort: next.sort ?? sort, view: next.view ?? view, tickers: next.tickers ?? tickers });
      router.replace(`/screener${q}`, { scroll: false });
      setPage(1);
    },
    [filters, signal, sort, view, tickers, router],
  );

  const flash = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };
  useEffect(() => () => void (toastTimer.current && clearTimeout(toastTimer.current)), []);

  // Live: results move with the market. Paused: they hold still while you read.
  const data = live || !frozen.current ? snaps : frozen.current;
  const results = useMemo(() => sortSnaps(runScreen(data, { filters, signal, tickers }), sort), [data, filters, signal, tickers, sort]);
  const pages = Math.max(1, Math.ceil(results.length / PAGE));
  const pageRows = results.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE);
  const toggleLive = () => {
    if (live) frozen.current = snaps;
    setLive(!live);
  };
  const toggleSelect = (sym: string) => setSelected((cur) => (cur.includes(sym) ? cur.filter((x) => x !== sym) : cur.length >= 5 ? cur : [...cur, sym]));

  const setFilter = (fid: string, oid: string) => {
    const rest = filters.filter((t) => !t.startsWith(`${fid}:`));
    push({ filters: oid ? [...rest, `${fid}:${oid}`] : rest });
  };

  const buildFromText = async () => {
    const q = ask.trim();
    if (!q) return;
    setAsking(true);
    let r: ParsedScreen;
    try {
      const res = await fetch("/api/screener/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) });
      r = res.ok ? ((await res.json()) as ParsedScreen) : parseScreenOffline(q);
    } catch {
      r = parseScreenOffline(q);
    }
    setAsking(false);
    setExplain(r);
    push({ filters: r.filters, signal: r.signal ?? "", sort: r.sort ?? sort });
  };

  const colIds = view === "custom" ? ["ticker", ...custom] : (VIEWS.find((v) => v.id === view)?.cols ?? []).length ? VIEWS.find((v) => v.id === view)!.cols : VIEWS[0].cols;
  const cols = colIds.map((c) => getColumn(c)).filter((c): c is NonNullable<typeof c> => !!c);

  const exportCsv = () => {
    const csv = toCsv(results, colIds);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shortlist-screen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const url = `${window.location.origin}/screener${screenToQuery({ filters, signal, sort, view })}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const save = () => {
    const name = window.prompt("Name this screen", explain?.explanation ? ask.slice(0, 40) : "My screen");
    if (name == null) return;
    const id = saveScreen({ name, filters, signal, tickers, sort, view, alert: false });
    flash(id ? "Screen saved" : "You've reached the limit of saved screens");
  };

  const lists = useWatchlists();
  const addAllToWatchlist = () => {
    const wl = lists[0];
    if (!wl) return;
    const pick = selected.length ? results.filter((s) => selected.includes(s.symbol)) : results.slice(0, 50);
    const toAdd = pick.filter((s) => !wl.symbols.includes(s.symbol));
    for (const s of toAdd) toggleSymbol(wl.id, s.symbol);
    flash(toAdd.length ? `Added ${toAdd.length} to ${wl.name}` : `Already in ${wl.name}`);
  };

  const visibleFilters = FILTERS.filter((d) => group === "all" || d.group === group);
  const activeCount = (g: FilterGroup) => filters.filter((t) => getFilter(t.split(":")[0])?.group === g).length;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:px-8 sm:py-8">
        <MarketsTabs />
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Screener</h1>
            <p className="mt-1 text-sm text-ink-400">Filter {snaps.length || "150+"} shares, ETFs and crypto by price, value, quality and chart signals.</p>
          </div>
          <DataBadges source={source} fund={fund} coverage={coverage} />
        </div>

        {/* Plain-English screen builder */}
        <Card tone="violet" className="mb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              buildFromText();
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="ask" className="sr-only">
              Describe a screen
            </label>
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300" />
              <input
                id="ask"
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                placeholder="Describe it: “profitable UK dividend payers near their 52-week lows”"
                className="w-full rounded-2xl border border-white/10 bg-ink-950/60 py-3 pl-9 pr-3 text-sm text-white placeholder-ink-500 focus:border-violet-400/60 focus:outline-none"
              />
            </div>
            <button type="submit" disabled={asking || !ask.trim()} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-400 to-sky-400 px-5 py-3 text-sm font-bold text-ink-950 disabled:opacity-50">
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Build screen
            </button>
          </form>
          {explain && (
            <p className="mt-2 flex items-start gap-2 text-sm text-violet-100/90">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
              <span>
                {explain.explanation} <span className="text-xs text-ink-400">{explain.source === "ai" ? "Built by AI." : "Matched by keywords."}</span>
              </span>
            </p>
          )}
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                title={p.blurb}
                onClick={() => {
                  setExplain({ ...p.screen, explanation: p.blurb, source: "offline" });
                  push({ filters: p.screen.filters, signal: p.screen.signal ?? "" });
                }}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-ink-200 hover:bg-white/[0.08]"
              >
                {p.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Filters */}
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="signal" className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Signal
              </label>
              <select id="signal" value={signal} onChange={(e) => push({ signal: e.target.value })} className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-violet-400/60 focus:outline-none">
                <option value="">None</option>
                {SIGNALS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                push({ tickers: tickerText.split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter(Boolean) });
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="tickers" className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Tickers
              </label>
              <input id="tickers" value={tickerText} onChange={(e) => setTickerText(e.target.value)} placeholder="e.g. AAPL, LLOY, NVDA" className="w-44 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder-ink-500 focus:border-violet-400/60 focus:outline-none sm:w-56" />
            </form>
            <div className="flex items-center gap-1.5">
              <label htmlFor="order" className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Order by
              </label>
              <select id="order" value={sort.replace(/^-/, "")} onChange={(e) => push({ sort: sort.startsWith("-") ? `-${e.target.value}` : e.target.value })} className="rounded-xl border border-white/10 bg-ink-950/60 px-2.5 py-2 text-sm text-white focus:outline-none">
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button onClick={() => push({ sort: sort.startsWith("-") ? sort.slice(1) : `-${sort}` })} aria-label={sort.startsWith("-") ? "Sorted high to low; switch to low to high" : "Sorted low to high; switch to high to low"} className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-950/60 px-2.5 py-2 text-xs font-semibold text-ink-200">
                <ArrowDownUp className="h-3.5 w-3.5" /> {sort.startsWith("-") ? "Desc" : "Asc"}
              </button>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Segmented size="sm" value={group} onChange={setGroup} options={GROUPS.map((g) => ({ id: g.id, label: g.id === "all" ? g.label : `${g.label}${activeCount(g.id as FilterGroup) ? ` · ${activeCount(g.id as FilterGroup)}` : ""}` }))} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {visibleFilters.map((d) => {
              const cur = filters.find((t) => t.startsWith(`${d.id}:`))?.split(":")[1] ?? "";
              return (
                <label key={d.id} className="block min-w-0" title={d.help}>
                  <span className={`mb-1 block truncate text-[11px] font-medium ${cur ? "text-violet-200" : "text-ink-400"}`}>{d.label}</span>
                  <select
                    value={cur}
                    onChange={(e) => setFilter(d.id, e.target.value)}
                    className={`w-full truncate rounded-xl border px-2.5 py-2 text-[13px] focus:outline-none ${cur ? "border-violet-400/50 bg-violet-500/10 text-white" : "border-white/10 bg-ink-950/60 text-ink-300"}`}
                  >
                    <option value="">Any</option>
                    {d.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          {(filters.length > 0 || signal || tickers.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {tickers.length > 0 && (
                <Chip onRemove={() => push({ tickers: [] })} tone="amber">
                  Tickers: {tickers.join(", ")}
                </Chip>
              )}
              {signal && (
                <Chip onRemove={() => push({ signal: "" })} tone="amber">
                  Signal: {SIGNALS.find((s) => s.id === signal)?.label}
                </Chip>
              )}
              {filters.map((t) => (
                <Chip key={t} onRemove={() => push({ filters: filters.filter((x) => x !== t) })}>
                  {tokenLabel(t)}
                </Chip>
              ))}
              <button onClick={() => (setExplain(null), push({ filters: [], signal: "", tickers: [] }))} className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-400 hover:text-white">
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
          )}
        </Card>

        <AdSlot placement="screener-top" />

        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-300" aria-live="polite">
            <span className="font-bold text-white">{mounted ? results.length : "…"}</span> of {snaps.length} match
          </p>
          <div className="flex flex-wrap gap-1.5">
            <ToolButton onClick={toggleLive} icon={live ? Pause : Play} label={live ? "Live" : "Paused"} />
            {selected.length >= 2 && <ToolButton onClick={() => setComparing(true)} icon={Scale} label={`Compare ${selected.length}`} />}
            <ToolButton onClick={save} icon={Save} label="Save" />
            <ToolButton onClick={share} icon={Link2} label="Share" />
            <ToolButton onClick={exportCsv} icon={Download} label="CSV" />
            <ToolButton onClick={addAllToWatchlist} icon={Star} label={selected.length ? `Watch ${selected.length}` : "Watch all"} />
          </div>
        </div>
        <div className="mb-3">
          <Segmented size="sm" value={view} onChange={(v) => push({ view: v })} options={VIEWS.map((v) => ({ id: v.id, label: v.label }))} />
        </div>

        {!mounted ? (
          <div className="skeleton h-96 rounded-3xl" />
        ) : results.length === 0 ? (
          <Card className="text-center">
            <p className="font-semibold text-white">Nothing matches all of those filters</p>
            <p className="mt-1 text-sm text-ink-400">Remove a filter or two — every one you add has to be true at once.</p>
          </Card>
        ) : view === "tickers" ? (
          <TickerCloud rows={results} />
        ) : view === "stats" ? (
          <StatsPanel rows={results} />
        ) : view === "charts" ? (
          <>
            <ChartsGrid rows={pageRows} />
            <Pager page={Math.min(page, pages)} pages={pages} onPage={setPage} />
          </>
        ) : (
          <>
            {view === "custom" && <ColumnPicker value={custom} onChange={saveCustom} />}
            <ResultsTable rows={pageRows} offset={(Math.min(page, pages) - 1) * PAGE} cols={cols} sort={sort} onSort={(id) => push({ sort: sort === `-${id}` ? id : `-${id}` })} selected={selected} onToggle={toggleSelect} />
            <Pager page={Math.min(page, pages)} pages={pages} onPage={setPage} />
            <p className="mt-2 text-center text-xs text-ink-500">Tick up to five rows to compare them side by side.</p>
          </>
        )}
        {comparing && <CompareSheet rows={results.filter((s) => selected.includes(s.symbol))} onClose={() => setComparing(false)} />}

        <SavedScreens />
        <AdSlot placement="screener-bottom" />

        {fund === "live" && (
          <p className="mt-6 text-xs leading-relaxed text-ink-500">
            Fundamentals are live for US companies{coverage && coverage.have < coverage.of ? ` (${coverage.have} of ${coverage.of} loaded so far)` : ""}. UK and other non-US companies, and any not loaded yet, show <span className="text-amber-200/80">demo figures</span>. Not investment advice.
          </p>
        )}
        {fund !== "live" && (
          <p className="mt-6 text-xs leading-relaxed text-ink-500">
            Valuation, growth, ownership and analyst figures are <span className="text-amber-200/80">demo data</span> shaped like each sector, so the screener works without a data subscription. Add a Finnhub key on the server for live fundamentals. Prices are {source === "live" ? "live" : "simulated"}. Not investment advice.
          </p>
        )}
      </main>
      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-24 z-40 mx-auto w-max rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 shadow-card sm:bottom-8">
          <Check className="mr-1 inline h-4 w-4" />
          {toast}
        </div>
      )}
    </div>
  );
}

function Chip({ children, onRemove, tone = "violet" }: { children: React.ReactNode; onRemove: () => void; tone?: "violet" | "amber" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium ring-1 ring-inset ${tone === "amber" ? "bg-amber-500/10 text-amber-100 ring-amber-400/25" : "bg-violet-500/10 text-violet-100 ring-violet-400/25"}`}>
      {children}
      <button onClick={onRemove} aria-label={`Remove ${typeof children === "string" ? children : "filter"}`} className="rounded-full p-0.5 hover:bg-white/10">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function ToolButton({ onClick, icon: Icon, label }: { onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-ink-200 hover:bg-white/[0.08]">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function ResultsTable({ rows, cols, sort, onSort, offset, selected, onToggle }: { rows: Snapshot[]; cols: (typeof COLUMNS)[number][]; sort: string; onSort: (id: string) => void; offset: number; selected: string[]; onToggle: (sym: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-white/[0.07] bg-ink-900/70 shadow-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-ink-400">
            <th scope="col" className="w-8 px-2 py-2.5 text-right font-semibold">
              No.
            </th>
            <th scope="col" className="w-6 px-1 py-2.5">
              <span className="sr-only">Select</span>
            </th>
            {cols.map((c, k) => {
              const active = sort.replace(/^-/, "") === c.id;
              return (
                <th key={c.id} scope="col" className={`whitespace-nowrap px-3 py-2.5 font-semibold ${c.align === "left" ? "text-left" : "text-right"} ${k === 0 ? "sticky left-0 z-10 bg-ink-900" : ""}`}>
                  <button onClick={() => onSort(c.id)} className={`inline-flex items-center gap-0.5 hover:text-white ${active ? "text-white" : ""}`} aria-label={`Sort by ${c.label}`}>
                    {c.label}
                    {active && <span aria-hidden>{sort.startsWith("-") ? "↓" : "↑"}</span>}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, r) => (
            <tr key={s.symbol} className={`border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] ${selected.includes(s.symbol) ? "bg-violet-500/[0.06]" : ""}`}>
              <td className="num px-2 py-2 text-right font-mono text-xs text-ink-500">{offset + r + 1}</td>
              <td className="px-1 py-2">
                <input type="checkbox" checked={selected.includes(s.symbol)} onChange={() => onToggle(s.symbol)} aria-label={`Select ${s.symbol} to compare`} className="accent-violet-400" />
              </td>
              {cols.map((c, k) => {
                const v = c.get(s);
                const tone = c.signed && typeof v === "number" ? (v > 0 ? "text-emerald-300" : v < 0 ? "text-rose-300" : "text-ink-300") : "text-ink-200";
                if (k === 0)
                  return (
                    <td key={c.id} className="sticky left-0 z-10 bg-ink-900 px-3 py-2">
                      <Link href={`/i/${s.symbol}`} className="flex items-center gap-2 font-bold text-white hover:underline">
                        <Avatar symbol={s.symbol} size={22} />
                        {s.symbol}
                      </Link>
                    </td>
                  );
                return (
                  <td key={c.id} className={`whitespace-nowrap px-3 py-2 ${c.align === "left" ? "max-w-[180px] truncate text-left" : "num text-right font-mono"} ${tone}`}>
                    {c.fmt(s)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartsGrid({ rows }: { rows: Snapshot[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((s) => (
        <Link key={s.symbol} href={`/i/${s.symbol}`} className="lift block rounded-3xl border border-white/[0.07] bg-ink-900/70 p-3 shadow-card">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar symbol={s.symbol} size={24} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{s.symbol}</p>
                <p className="truncate text-[11px] text-ink-400">{s.i.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="num font-mono text-sm text-white">{fmtNative(s.price, s.i.currency)}</p>
              <p className={`num font-mono text-xs ${s.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {s.change >= 0 ? "+" : ""}
                {s.change.toFixed(2)}%
              </p>
            </div>
          </div>
          <MiniCandles bars={s.bars} pattern={s.pattern} level={s.srLevel} height={110} />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-400">
            <span>{s.pattern ? <span className={s.pattern.bias === "bullish" ? "text-emerald-300" : s.pattern.bias === "bearish" ? "text-rose-300" : "text-amber-200"}>{s.pattern.label}</span> : "No clear pattern"}</span>
            <span>RSI {s.rsi.toFixed(0)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SavedScreens() {
  const screens = useSavedScreens();
  if (!screens.length) return null;
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-400">Your screens</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {screens.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-ink-900/70 p-3">
            <Link href={`/screener${screenToQuery(s)}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{s.name}</p>
              <p className="truncate text-xs text-ink-400">{[s.signal ? SIGNALS.find((x) => x.id === s.signal)?.label : null, ...s.filters.map(tokenLabel)].filter(Boolean).join(" · ") || "No filters"}</p>
            </Link>
            <button
              onClick={() => {
                if (!s.alert && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
                setScreenAlert(s.id, !s.alert);
              }}
              aria-label={s.alert ? `Stop alerts for ${s.name}` : `Alert me when a share enters ${s.name}`}
              title={s.alert ? "Alerts on: you'll hear when a share enters this screen" : "Alert me when a share enters this screen"}
              className={`rounded-xl p-2 ${s.alert ? "bg-sky-500/15 text-sky-300" : "text-ink-400 hover:bg-white/[0.06] hover:text-white"}`}
            >
              {s.alert ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button onClick={() => window.confirm(`Delete "${s.name}"?`) && deleteScreen(s.id)} aria-label={`Delete ${s.name}`} className="rounded-xl p-2 text-ink-500 hover:bg-white/[0.06] hover:text-rose-300">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
