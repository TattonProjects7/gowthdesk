"use client";

import { useState } from "react";
import Link from "next/link";
import { BUSINESSES } from "@/lib/businesses";
import { ArrowLeft, Play, Loader2, Check, Mail, Calendar, Zap, AlertCircle } from "lucide-react";

export default function SchedulePage() {
  const [running, setRunning] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("info@tattonprojects.co.uk");
  const [secret, setSecret] = useState("");
  const [log, setLog] = useState<{ biz: string; status: string }[]>([]);

  async function runForBusiness(slug: string) {
    setRunning(slug);
    setError("");
    try {
      const res = await fetch("/api/auto-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessSlug: slug, toEmail: email, secret }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDone(prev => [...prev, slug]);
      setLog(prev => [...prev, { biz: slug, status: "✅ Sent" }]);
    } catch (e) {
      setError(String(e));
      setLog(prev => [...prev, { biz: slug, status: `❌ ${String(e)}` }]);
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    setLog([]);
    for (const biz of BUSINESSES) {
      await runForBusiness(biz.slug);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-white flex flex-col">
      <header className="border-b border-ink-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-ink-400 hover:text-white text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="h-4 w-px bg-ink-700" />
        <Zap className="h-5 w-5 text-violet-400" />
        <span className="font-bold">Automation</span>
      </header>

      <main className="flex-1 p-8 max-w-3xl mx-auto w-full space-y-8">

        {/* What this does */}
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-6">
          <h1 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-400" /> What this bot does
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { icon: "🎯", title: "Generates keywords", desc: "20 target search terms per business" },
              { icon: "📝", title: "Writes a blog post", desc: "1,500-word SEO article for your site" },
              { icon: "🌐", title: "Writes a guest post", desc: "Article to pitch to external sites" },
              { icon: "🔗", title: "Finds target sites", desc: "15 websites to approach for backlinks" },
              { icon: "📧", title: "Sends outreach emails", desc: "Pitches your guest post to editors" },
              { icon: "📨", title: "Emails you everything", desc: "Full report lands in your inbox" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-3 rounded-xl bg-ink-800 p-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-ink-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-amber-800 bg-amber-950 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              <strong>What still needs 1 click from you:</strong> Publishing the blog to your website, and ticking Submit on directory forms (Google requires human verification to stop spam). Everything else runs automatically.
            </p>
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-6 space-y-4">
          <h2 className="font-bold flex items-center gap-2"><Mail className="h-4 w-4 text-violet-400" /> Email settings</h2>
          <div>
            <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Send reports to</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ink-700 bg-ink-800 px-4 py-3 text-sm text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">
              CRON_SECRET <span className="text-ink-500 font-normal">(from your .env.local)</span>
            </label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Set CRON_SECRET=anything in .env.local"
              className="w-full rounded-lg border border-ink-700 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-ink-600 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Run per business */}
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-6 space-y-4">
          <h2 className="font-bold flex items-center gap-2"><Play className="h-4 w-4 text-violet-400" /> Run now</h2>
          <p className="text-sm text-ink-400">Run for one business or all four at once. Each generates all content and emails it to you. Takes about 90 seconds per business.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BUSINESSES.map(biz => {
              const isDone = done.includes(biz.slug);
              const isRunning = running === biz.slug;
              return (
                <button
                  key={biz.slug}
                  onClick={() => runForBusiness(biz.slug)}
                  disabled={!!running}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                    isDone
                      ? "border-emerald-700 bg-emerald-950 text-emerald-300"
                      : isRunning
                      ? "border-violet-700 bg-violet-950 text-violet-300"
                      : "border-ink-700 bg-ink-800 hover:border-ink-500 text-white"
                  } disabled:cursor-wait`}
                >
                  <span className="text-2xl">{biz.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{biz.name}</p>
                    <p className="text-xs opacity-60">{biz.url}</p>
                  </div>
                  {isRunning && <Loader2 className="h-4 w-4 animate-spin text-violet-400" />}
                  {isDone && <Check className="h-4 w-4 text-emerald-400" />}
                  {!isRunning && !isDone && <Play className="h-4 w-4 text-ink-500" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={runAll}
            disabled={!!running}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
          >
            {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Running {BUSINESSES.find(b => b.slug === running)?.name}…</> : <><Zap className="h-4 w-4" /> Run all 4 businesses now</>}
          </button>

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {log.length > 0 && (
            <div className="rounded-xl border border-ink-700 bg-ink-800 p-4 space-y-1">
              {log.map((entry, i) => (
                <p key={i} className="text-sm font-mono"><span className="text-ink-400">{entry.biz}:</span> {entry.status}</p>
              ))}
            </div>
          )}
        </div>

        {/* Weekly schedule */}
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-6 space-y-4">
          <h2 className="font-bold flex items-center gap-2"><Calendar className="h-4 w-4 text-violet-400" /> Weekly auto-run (deploy to Vercel)</h2>
          <p className="text-sm text-ink-400">
            Once you deploy GrowthDesk to Vercel, it will run automatically every Monday at 8am and email all 4 reports to you — no action needed.
          </p>
          <div className="rounded-xl bg-ink-800 border border-ink-700 p-4">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Add to vercel.json</p>
            <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">{`{
  "crons": [{
    "path": "/api/auto-run",
    "schedule": "0 8 * * 1"
  }]
}`}</pre>
          </div>
          <p className="text-xs text-ink-500">Add <code className="text-violet-400">CRON_SECRET</code>, <code className="text-violet-400">RESEND_API_KEY</code>, <code className="text-violet-400">REPORT_EMAIL</code> and <code className="text-violet-400">NEXT_PUBLIC_APP_URL</code> to your Vercel environment variables.</p>
        </div>

      </main>
    </div>
  );
}
