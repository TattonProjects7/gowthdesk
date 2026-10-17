"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BellRing, ChevronDown, ChevronUp, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import Nav from "@/components/Nav";
import InstrumentRow from "@/components/InstrumentRow";
import { Button, Card, Empty, Input, Segmented } from "@/components/ui";
import { useMarket } from "@/lib/useMarket";
import { getInstrument, searchInstruments } from "@/lib/instruments";
import { useWatchlists, createWatchlist, deleteWatchlist, renameWatchlist, toggleSymbol, reorderSymbol, MAX_WATCHLISTS } from "@/lib/watchlists";
import { usePriceAlerts, describeAlert, removePriceAlert } from "@/lib/pricealerts";

// Watchlists — up to 50 named lists (IG), with quick add, reorder and the price
// alerts you've set on each name alongside.
export default function WatchlistPage() {
  const { mounted, priceFor, closesFor } = useMarket();
  const lists = useWatchlists();
  const alerts = usePriceAlerts();
  const [active, setActive] = useState(lists[0]?.id ?? "");
  const list = lists.find((l) => l.id === active) ?? lists[0];
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");

  const results = useMemo(() => (q.trim() ? searchInstruments(q, 6) : []), [q]);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 sm:px-8 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-400" /> Watchlists
          </h1>
          <span className="text-xs text-ink-500">
            {lists.length}/{MAX_WATCHLISTS}
          </span>
          <Button
            variant="ghost"
            className="ml-auto"
            disabled={lists.length >= MAX_WATCHLISTS}
            onClick={() => {
              const id = createWatchlist(`Watchlist ${lists.length + 1}`);
              if (id) setActive(id);
            }}
          >
            <Plus className="h-4 w-4" /> New list
          </Button>
        </div>

        {lists.length > 1 && (
          <div className="mb-4">
            <Segmented options={lists.map((l) => ({ id: l.id, label: `${l.name} (${l.symbols.length})` }))} value={list.id} onChange={setActive} />
          </div>
        )}

        {list && (
          <>
            <div className="flex items-center gap-2 mb-3">
              {renaming ? (
                <form
                  className="flex gap-2 flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    renameWatchlist(list.id, name);
                    setRenaming(false);
                  }}
                >
                  <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
                  <Button type="submit">Save</Button>
                  <Button type="button" variant="ghost" onClick={() => setRenaming(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-white">{list.name}</h2>
                  <button
                    onClick={() => {
                      setName(list.name);
                      setRenaming(true);
                    }}
                    className="text-ink-500 hover:text-white"
                    aria-label="Rename"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {lists.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete “${list.name}”?`)) {
                          deleteWatchlist(list.id);
                          setActive(lists.find((l) => l.id !== list.id)?.id ?? "");
                        }
                      }}
                      className="text-ink-500 hover:text-rose-400"
                      aria-label="Delete list"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Add */}
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Add a share, ETF or coin…"
                className="w-full rounded-xl border border-ink-700 bg-ink-900 pl-10 pr-3 py-2.5 text-sm text-white placeholder-ink-500 focus:border-rose-600 focus:outline-none"
              />
              {results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1">
                  {results.map((r) => {
                    const inList = list.symbols.includes(r.symbol);
                    return (
                      <button
                        key={r.symbol}
                        onClick={() => {
                          toggleSymbol(list.id, r.symbol);
                          setQ("");
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-ink-800"
                      >
                        <span className="w-14 font-bold text-white text-sm">{r.symbol}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-300">{r.name}</span>
                        <span className="text-xs text-ink-500">{inList ? "remove" : "add"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {list.symbols.length === 0 ? (
              <Empty icon={Star} title="This list is empty" body="Search above to add shares, ETFs or crypto, or browse the markets." cta={{ href: "/markets", label: "Browse markets" }} />
            ) : (
              <div className="space-y-2">
                {!mounted && list.symbols.map((s) => <div key={s} className="h-[62px] rounded-xl border border-white/[0.07] bg-ink-900/70 shadow-card animate-pulse" />)}
                {mounted &&
                  list.symbols.map((s, idx) => {
                    const i = getInstrument(s);
                    if (!i) return null;
                    const mine = alerts.filter((a) => a.symbol === s && !a.triggeredAt);
                    return (
                      <InstrumentRow
                        key={s}
                        i={i}
                        price={priceFor(s)}
                        closes={closesFor(s)}
                        sub={mine.length ? <span className="inline-flex items-center gap-1 text-amber-300"><BellRing className="h-3 w-3" /> {mine.length} alert{mine.length > 1 ? "s" : ""}</span> : undefined}
                        right={
                          <div className="flex items-center gap-0.5 text-ink-500">
                            <button onClick={() => reorderSymbol(list.id, s, -1)} disabled={idx === 0} className="hover:text-white disabled:opacity-30" aria-label="Move up">
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button onClick={() => reorderSymbol(list.id, s, 1)} disabled={idx === list.symbols.length - 1} className="hover:text-white disabled:opacity-30" aria-label="Move down">
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button onClick={() => toggleSymbol(list.id, s)} className="ml-1 hover:text-rose-400" aria-label="Remove">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        }
                      />
                    );
                  })}
              </div>
            )}
          </>
        )}

        {/* All price alerts */}
        {alerts.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">Your price alerts</h2>
            <Card>
              <ul className="divide-y divide-ink-800">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 text-sm">
                    <BellRing className={`h-4 w-4 shrink-0 ${a.triggeredAt ? "text-emerald-400" : "text-amber-400"}`} />
                    <Link href={`/i/${a.symbol}`} className={`flex-1 hover:underline ${a.triggeredAt ? "text-ink-500 line-through" : "text-ink-200"}`}>
                      {describeAlert(a)}
                    </Link>
                    <span className="text-xs text-ink-500">{a.triggeredAt ? "triggered" : "armed"}</span>
                    <button onClick={() => removePriceAlert(a.id)} className="text-ink-500 hover:text-rose-400" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
