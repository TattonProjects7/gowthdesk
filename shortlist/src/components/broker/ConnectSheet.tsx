"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { broker, useBroker } from "@/lib/broker/client";
import type { BrokerEnv } from "@/lib/broker/types";
import { celebrate } from "@/lib/celebrate";

// Connect a Trading 212 account for real mode. The key is checked against the
// chosen server and then stored encrypted in an httpOnly cookie — this page
// never keeps it.
export default function ConnectSheet() {
  const { connectOpen, status } = useBroker();
  const [env, setEnv] = useState<BrokerEnv>("demo");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (connectOpen) {
      setErr(null);
      if (!status) void broker.refreshStatus();
    } else {
      setKey("");
      setSecret("");
      setAccept(false);
      setBusy(false);
    }
  }, [connectOpen, status]);

  if (!connectOpen) return null;
  const notConfigured = status !== null && !status.configured;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await broker.connect(env, key, secret, accept);
      celebrate({ emoji: env === "live" ? "🔐" : "🧪", title: env === "live" ? "Live account connected" : "Practice account connected", subtitle: "You're in real mode. Switch back to demo any time." });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't connect.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button aria-label="Close" onClick={() => broker.closeConnect()} className="absolute inset-0 bg-black/70 backdrop-blur-sm fade-in" />
      <form
        onSubmit={submit}
        aria-label="Connect Trading 212"
        className="sheet-up relative max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/10 bg-ink-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px] sm:pb-5"
      >
        <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-gradient-to-br from-sky-500/30 to-blue-500/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-sky-900/40">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Connect Trading 212</h2>
              <p className="text-xs text-ink-400">Trade for real from Shortlist. Trading 212 holds your money and fills your orders.</p>
            </div>
          </div>
          <button type="button" onClick={() => broker.closeConnect()} className="rounded-full p-1.5 text-ink-400 hover:bg-white/5 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {notConfigured && (
          <p className="relative mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            Real trading isn&apos;t switched on for this server yet. Whoever runs this app needs to add a <span className="font-mono">BROKER_SECRET</span> setting, then you can connect.
          </p>
        )}

        <fieldset className="relative mt-5" disabled={notConfigured || busy}>
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Which Trading 212 account?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "demo", title: "Practice", body: "Trading 212's free practice money. Test everything safely.", tone: "from-blue-400 to-sky-400" },
                { id: "live", title: "Live", body: "Real money in your Invest or Stocks ISA account.", tone: "from-amber-400 to-orange-500" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={env === o.id}
                onClick={() => setEnv(o.id)}
                className={`rounded-2xl border p-3 text-left transition-all ${env === o.id ? "border-white/30 bg-white/[0.07] shadow-[0_0_0_1px_rgba(255,255,255,0.15)]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}
              >
                <span className={`inline-block rounded-full bg-gradient-to-r ${o.tone} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-950`}>{o.title}</span>
                <span className="mt-1.5 block text-xs text-ink-300">{o.body}</span>
              </button>
            ))}
          </div>

          <ol className="mt-4 space-y-1 rounded-2xl bg-white/[0.03] p-3 text-xs text-ink-300">
            <li>1. In the Trading 212 app, switch to your {env === "live" ? "live (real money)" : "practice"} account.</li>
            <li>2. Open Settings → API (Beta) and generate a key. Allow account data and orders.</li>
            <li>3. Paste the key below, plus the secret if Trading 212 shows one.</li>
          </ol>

          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-ink-400" htmlFor="t212-key">
            API key
          </label>
          <div className="relative mt-1">
            <input
              id="t212-key"
              type={show ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your Trading 212 API key"
              className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-3 pr-10 font-mono text-sm text-white placeholder-ink-500 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:text-white" aria-label={show ? "Hide key" : "Show key"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-ink-400" htmlFor="t212-secret">
            API secret <span className="normal-case tracking-normal text-ink-500">(if shown)</span>
          </label>
          <input
            id="t212-secret"
            type={show ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-3 font-mono text-sm text-white placeholder-ink-500 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          />

          {env === "live" && (
            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-3 text-xs text-amber-100">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-400" />
              <span>
                I understand that in real mode my orders use <strong>real money</strong> in my Trading 212 account. Shortlist is not a broker and doesn&apos;t give advice, and investments can fall as well as rise.
              </span>
            </label>
          )}
        </fieldset>

        {err && <p className="relative mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}

        <button
          type="submit"
          disabled={notConfigured || busy || key.trim().length < 8 || (env === "live" && !accept)}
          className={`relative mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r py-3.5 text-sm font-bold text-ink-950 transition-transform active:scale-[0.98] disabled:opacity-40 ${env === "live" ? "from-amber-400 to-orange-500" : "from-blue-400 to-sky-400"}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {env === "live" ? "Connect live account" : "Connect practice account"}
        </button>
        <p className="relative mt-3 flex items-start gap-2 text-[11px] text-ink-400">
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400" />
          Your key is checked with Trading 212, then encrypted into a secure cookie on this device that page scripts can&apos;t read. Disconnect in Settings or revoke the key in Trading 212 at any time.
        </p>
      </form>
    </div>
  );
}
