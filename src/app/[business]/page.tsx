"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BUSINESSES } from "@/lib/businesses";
import {
  ArrowLeft, Copy, Check, Loader2, Sparkles, TrendingUp,
  FileText, Globe, Mail, ExternalLink, Building2, Code, Search
} from "lucide-react";

const TOOLS = [
  { key: "keywords",       label: "Keywords",        icon: TrendingUp,  desc: "20 target SEO keywords with search volume and difficulty",  hasExtra: false },
  { key: "blog",           label: "Blog post",        icon: FileText,    desc: "Full 1,500-word SEO blog post ready to publish on your site", hasExtra: true,  extraLabel: "Topic or keyword to target (optional)" },
  { key: "guest",          label: "Guest post",       icon: Globe,       desc: "900-word article to publish on OTHER websites for backlinks", hasExtra: true,  extraLabel: "Topic focus (optional)" },
  { key: "sites",          label: "Target sites",     icon: Search,      desc: "15 real websites and blogs that could link to or feature you", hasExtra: false },
  { key: "outreach",       label: "Outreach emails",  icon: Mail,        desc: "3 cold pitch emails to send to site editors and journalists", hasExtra: true,  extraLabel: "Target site type (optional, e.g. 'trade magazine')" },
  { key: "metatags",       label: "Meta tags",        icon: FileText,    desc: "SEO title tags and meta descriptions for your 6 key pages",  hasExtra: false },
  { key: "schema",         label: "Schema markup",    icon: Code,        desc: "JSON-LD structured data to paste into your site's <head>",   hasExtra: false },
  { key: "googlebusiness", label: "Google Business",  icon: Building2,   desc: "Full Google Business Profile — description, posts & Q&As",   hasExtra: false },
];

export default function BusinessPage() {
  const params = useParams();
  const slug = typeof params.business === "string" ? params.business : "";
  const biz = BUSINESSES.find(b => b.slug === slug);

  const [activeKey, setActiveKey] = useState(TOOLS[0].key);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (!biz) {
    return (
      <div className="min-h-screen bg-ink-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-300 mb-4">Business not found</p>
          <Link href="/" className="text-violet-400 underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const activeTool = TOOLS.find(t => t.key === activeKey)!;

  async function generate() {
    setLoading(activeKey);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessSlug: slug, type: activeKey, extra: extras[activeKey] ?? "" }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setResults(prev => ({ ...prev, [activeKey]: data.content }));
    } finally {
      setLoading(null);
    }
  }

  async function copy(key: string) {
    await navigator.clipboard.writeText(results[key]);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const result = results[activeKey];
  const isLoading = loading === activeKey;

  return (
    <div className="min-h-screen bg-ink-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-ink-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-ink-400 hover:text-white text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="h-4 w-px bg-ink-700" />
        <span className="text-xl">{biz.emoji}</span>
        <div>
          <span className="font-bold">{biz.name}</span>
          <a href={biz.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-ink-400 hover:text-violet-400 transition-colors inline-flex items-center gap-1">
            {biz.url} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — tool picker */}
        <aside className="w-56 shrink-0 border-r border-ink-800 bg-ink-900 flex flex-col py-4">
          <p className="px-4 mb-3 text-xs font-semibold uppercase tracking-widest text-ink-500">Tools</p>
          {TOOLS.map(({ key, label, icon: Icon }) => {
            const done = !!results[key];
            return (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left transition-colors ${
                  activeKey === key
                    ? "bg-ink-800 text-white border-r-2 border-violet-500"
                    : "text-ink-400 hover:text-white hover:bg-ink-800"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${activeKey === key ? "text-violet-400" : done ? "text-emerald-500" : "text-ink-500"}`} />
                <span>{label}</span>
                {done && activeKey !== key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              </button>
            );
          })}

          {/* Business context */}
          <div className="mt-auto mx-3 rounded-xl border border-ink-700 bg-ink-800 p-3">
            <p className="text-xs font-semibold text-ink-400 mb-1">Target audience</p>
            <p className="text-xs text-ink-300 leading-relaxed">{biz.audience}</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-y-auto p-8">
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col gap-6">
            {/* Tool header */}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <activeTool.icon className="h-6 w-6 text-violet-400" />
                {activeTool.label}
                <span className="text-ink-500 font-normal text-base">— {biz.name}</span>
              </h1>
              <p className="text-ink-400 text-sm mt-1">{activeTool.desc}</p>
            </div>

            {/* Optional extra input */}
            {activeTool.hasExtra && (
              <div>
                <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
                  {activeTool.extraLabel}
                </label>
                <input
                  type="text"
                  value={extras[activeKey] ?? ""}
                  onChange={e => setExtras(prev => ({ ...prev, [activeKey]: e.target.value }))}
                  placeholder="Leave blank to let AI choose"
                  className="w-full rounded-lg border border-ink-700 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-ink-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-semibold text-white hover:bg-violet-500 disabled:opacity-60 transition-colors w-full sm:w-auto sm:self-start"
            >
              {isLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><Sparkles className="h-4 w-4" /> {result ? "Regenerate" : "Generate"}</>}
            </button>

            {/* Result */}
            {result && (
              <div className="flex-1 rounded-2xl border border-ink-700 bg-ink-900 overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-800 px-5 py-3">
                  <span className="text-sm font-semibold text-ink-300">Output</span>
                  <button
                    onClick={() => copy(activeKey)}
                    className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800 px-3 py-1.5 text-xs font-semibold text-ink-300 hover:text-white hover:border-ink-500 transition-colors"
                  >
                    {copied === activeKey ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy all</>}
                  </button>
                </div>
                <pre className="p-6 text-sm text-ink-200 whitespace-pre-wrap leading-relaxed font-sans overflow-x-auto">
                  {result}
                </pre>
              </div>
            )}

            {!result && !isLoading && (
              <div className="flex-1 rounded-2xl border border-dashed border-ink-800 flex items-center justify-center p-12 text-center">
                <div>
                  <activeTool.icon className="h-10 w-10 text-ink-700 mx-auto mb-3" />
                  <p className="text-ink-500 text-sm">Hit Generate to create {activeTool.label.toLowerCase()} for {biz.name}</p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right panel — business info */}
        <aside className="hidden xl:flex w-64 shrink-0 border-l border-ink-800 bg-ink-900 flex-col p-5 gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">Business</p>
            <p className="text-sm text-ink-200 leading-relaxed">{biz.description}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">Niche</p>
            <p className="text-sm text-ink-300">{biz.niche}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">Location</p>
            <p className="text-sm text-ink-300">{biz.location}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">Competitors</p>
            <ul className="space-y-1">
              {biz.competitors.map(c => (
                <li key={c} className="text-xs text-ink-400">• {c}</li>
              ))}
            </ul>
          </div>
          <div className="mt-auto rounded-xl bg-ink-800 border border-ink-700 p-4">
            <p className="text-xs font-semibold text-violet-400 mb-2">How to use</p>
            <ol className="text-xs text-ink-300 space-y-1.5 list-decimal list-inside">
              <li>Start with Keywords</li>
              <li>Write a Blog post for your site</li>
              <li>Find Target sites for links</li>
              <li>Write a Guest post for each</li>
              <li>Send Outreach emails</li>
              <li>Fix Meta tags + Schema</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
