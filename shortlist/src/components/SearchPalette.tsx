"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CornerDownLeft, Info, Search, SlidersHorizontal, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { INSTRUMENTS, fmtNative, getInstrument } from "@/lib/instruments";
import { notCovered, normalize, search, type SearchHit } from "@/lib/search";
import { useMarket } from "@/lib/useMarket";
import { tapHaptic } from "@/lib/native";

// Finviz-style search from anywhere: the header button, ⌘K / Ctrl+K, or "/".
// Shares, ETFs and crypto with live price and change, the app's own pages, and
// a "Screen for …" action that hands the words to the screener's AI builder.

const RECENT_KEY = "shortlist.search.recent.v1";
const POPULAR = ["NVDA", "AAPL", "TSLA", "LLOY", "RR", "VUSA", "BTC", "PLUS"];

const PAGES: { href: string; label: string; words: string }[] = [
  { href: "/portfolio", label: "Portfolio", words: "portfolio holdings balance investments account" },
  { href: "/markets", label: "Markets overview", words: "markets overview movers risers fallers" },
  { href: "/screener", label: "Screener", words: "screener screen filter finder" },
  { href: "/maps", label: "Heatmap", words: "heatmap heat map treemap maps" },
  { href: "/groups", label: "Sector groups", words: "groups sectors industries performance" },
  { href: "/charts", label: "Charts", words: "charts chart candlestick technical analysis" },
  { href: "/news", label: "News", words: "news headlines pulse" },
  { href: "/calendar", label: "Calendar", words: "calendar earnings dividends events economic" },
  { href: "/watchlist", label: "Watchlist", words: "watchlist favourites favorites" },
  { href: "/learn", label: "Learn", words: "learn lessons courses education academy beginner" },
  { href: "/scan", label: "Short scanner", words: "shorts short scanner squeeze" },
  { href: "/settings", label: "Settings", words: "settings preferences notifications account" },
  { href: "/pricing", label: "Plans and ad-free", words: "pricing plans pro subscription remove ads adfree upgrade" },
];

function matchPages(q: string) {
  const words = normalize(q).split(" ").filter((w) => w.length >= 2);
  if (!words.length) return [];
  return PAGES.filter((p) => {
    const hay = normalize(`${p.label} ${p.words}`).split(" ");
    return words.every((w) => hay.some((h) => h.startsWith(w)));
  }).slice(0, 3);
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).filter((s) => getInstrument(s)) : [];
  } catch {
    return [];
  }
}

function pushRecent(symbol: string) {
  try {
    const next = [symbol, ...readRecent().filter((s) => s !== symbol)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

type Item = { kind: "instrument"; hit: SearchHit } | { kind: "page"; href: string; label: string } | { kind: "screen"; q: string };

/** The header trigger plus the palette it opens. */
export default function SearchPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => {
          tapHaptic();
          setOpen(true);
        }}
        aria-label="Search shares, ETFs and crypto"
        aria-keyshortcuts="Control+K Meta+K /"
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-ink-300 transition-colors hover:bg-ink-900 hover:text-white lg:rounded-full lg:border lg:border-white/10 lg:bg-white/[0.04] lg:py-1 lg:pl-3 lg:pr-1.5"
      >
        <Search className="h-4 w-4" />
        <span className="hidden text-sm lg:inline">Search</span>
        <kbd className="hidden rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-sans text-[10px] text-ink-400 lg:inline">⌘K</kbd>
      </button>
      {open && <Palette onClose={() => setOpen(false)} />}
    </>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { mounted, priceFor, closesFor } = useMarket();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setRecent(readRecent());
    input.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const typed = q.trim();
  const hits = useMemo(() => (typed ? search(INSTRUMENTS, typed, 8) : []), [typed]);
  const missing = useMemo(() => (typed ? notCovered(typed) : null), [typed]);
  const pages = useMemo(() => matchPages(typed), [typed]);

  const items: Item[] = useMemo(() => {
    if (!typed) {
      const syms = [...recent, ...POPULAR.filter((s) => !recent.includes(s))].slice(0, 8);
      return syms.map((s) => ({ kind: "instrument" as const, hit: { i: getInstrument(s)!, score: 0, kind: "symbol" as const } }));
    }
    const out: Item[] = hits.map((hit) => ({ kind: "instrument" as const, hit }));
    for (const p of pages) out.push({ kind: "page", href: p.href, label: p.label });
    if (typed.length >= 2) out.push({ kind: "screen", q: typed });
    return out;
  }, [typed, hits, pages, recent]);

  useEffect(() => setActive(0), [typed]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = useCallback(
    (it: Item) => {
      if (it.kind === "instrument") {
        pushRecent(it.hit.i.symbol);
        router.push(`/i/${it.hit.i.symbol}`);
      } else if (it.kind === "page") router.push(it.href);
      else router.push(`/screener?ask=${encodeURIComponent(it.q)}`);
      onClose();
    },
    [router, onClose],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      go(items[active]);
    }
  };

  const firstPage = items.findIndex((it) => it.kind !== "instrument");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-xl" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a company, ticker, fund or coin"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-white placeholder-ink-500 focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={items[active] ? `search-opt-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          <button onClick={onClose} aria-label="Close search" className="rounded-md p-1 text-ink-400 hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain py-1.5">
          {!typed && <p className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{recent.length ? "Recent and popular" : "Popular"}</p>}
          {typed && hits.length > 0 && <p className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Shares, funds and crypto</p>}
          {missing && (
            <p className="mx-3 my-1.5 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {missing.name} ({missing.listing}) isn&apos;t on Shortlist yet.{hits.length ? " These are the closest matches." : ""}
              </span>
            </p>
          )}
          {typed && hits.length === 0 && !missing && (
            <p className="px-4 py-3 text-sm text-ink-400">
              No share, fund or coin matches &ldquo;{typed}&rdquo;. Check the spelling, try the ticker, or let the screener find it below.
            </p>
          )}

          <ul id="search-results" ref={list} role="listbox" aria-label="Results">
            {items.map((it, idx) => {
              const on = idx === active;
              const base = `flex w-full items-center gap-3 px-4 py-2 text-left ${on ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}`;
              const header = idx === firstPage && typed ? <li key="go-h" role="presentation" className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Go to</li> : null;
              if (it.kind === "instrument") {
                const i = it.hit.i;
                const price = mounted ? priceFor(i.symbol) : 0;
                const closes = mounted ? closesFor(i.symbol, 3) : [];
                const prev = closes[closes.length - 2] || price;
                const chg = prev ? (price / prev - 1) * 100 : 0;
                return (
                  <li key={i.symbol} id={`search-opt-${idx}`} role="option" aria-selected={on} data-idx={idx}>
                    <button className={base} onMouseEnter={() => setActive(idx)} onClick={() => go(it)}>
                      <Avatar symbol={i.symbol} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="font-semibold text-white">{i.symbol}</span>
                          <span className="truncate text-sm text-ink-300">{i.name}</span>
                        </span>
                        <span className="block truncate text-[11px] text-ink-500">
                          {i.type === "crypto" ? "Crypto" : i.type === "etf" ? "ETF" : i.exchange} · {i.type === "stock" ? i.industry ?? i.sector : i.sector}
                          {it.hit.kind === "typo" && <span className="text-amber-300/80"> · closest spelling</span>}
                        </span>
                      </span>
                      {mounted && price > 0 && (
                        <span className="text-right">
                          <span className="num block font-mono text-sm text-white">{fmtNative(price, i.currency)}</span>
                          <span className={`num block font-mono text-[11px] ${chg >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {chg >= 0 ? "+" : ""}
                            {chg.toFixed(2)}%
                          </span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              }
              if (it.kind === "page")
                return [
                  header,
                  <li key={it.href} id={`search-opt-${idx}`} role="option" aria-selected={on} data-idx={idx}>
                    <button className={base} onMouseEnter={() => setActive(idx)} onClick={() => go(it)}>
                      <ArrowRight className="h-4 w-4 text-ink-400" />
                      <span className="flex-1 text-sm text-ink-100">{it.label}</span>
                    </button>
                  </li>,
                ];
              return [
                header,
                <li key="screen" id={`search-opt-${idx}`} role="option" aria-selected={on} data-idx={idx}>
                  <button className={base} onMouseEnter={() => setActive(idx)} onClick={() => go(it)}>
                    <SlidersHorizontal className="h-4 w-4 text-blue-300" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-100">
                      Screen for &ldquo;<span className="text-white">{it.q}</span>&rdquo;
                    </span>
                    <span className="text-[11px] text-ink-500">Screener</span>
                  </button>
                </li>,
              ];
            })}
          </ul>
        </div>

        <div className="hidden items-center gap-3 border-t border-white/[0.07] px-4 py-2 text-[11px] text-ink-500 sm:flex">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/10 px-1">↑</kbd>
            <kbd className="rounded border border-white/10 px-1">↓</kbd> move
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" /> open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/10 px-1">esc</kbd> close
          </span>
          <span className="ml-auto">Tip: press / anywhere to search</span>
        </div>
      </div>
    </div>
  );
}
