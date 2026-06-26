import Link from "next/link";
import { BUSINESSES } from "@/lib/businesses";
import { ArrowRight, TrendingUp, FileText, Globe, Mail } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-ink-950 text-white flex flex-col">
      <header className="border-b border-ink-800 px-8 py-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white font-bold text-sm">G</div>
        <span className="font-bold text-lg tracking-tight">GrowthDesk</span>
        <span className="ml-2 rounded-full bg-violet-900 px-2 py-0.5 text-xs text-violet-300">SEO + Content AI</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center mb-12 max-w-xl">
          <h1 className="text-4xl font-bold mb-3">Your marketing engine</h1>
          <p className="text-ink-300 text-lg">AI-written SEO content, blog posts, guest articles and outreach — one click per tool, all three businesses.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-5xl">
          {BUSINESSES.map(biz => (
            <Link
              key={biz.slug}
              href={`/${biz.slug}`}
              className="group rounded-2xl border border-ink-700 bg-ink-900 p-6 hover:border-ink-500 hover:bg-ink-800 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{biz.emoji}</span>
                <ArrowRight className="h-4 w-4 text-ink-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-bold text-lg mb-1">{biz.name}</h2>
              <p className="text-sm text-ink-300 mb-3 leading-relaxed">{biz.tagline}</p>
              <p className="text-xs text-ink-400 font-mono">{biz.url}</p>
            </Link>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl w-full">
          {[
            { icon: TrendingUp, label: "Keyword research", desc: "20 ranked keywords per business" },
            { icon: FileText,   label: "SEO blog posts",  desc: "1,500-word posts for your own sites" },
            { icon: Globe,      label: "Guest posts",     desc: "Articles for other sites = backlinks" },
            { icon: Mail,       label: "Outreach emails", desc: "Cold pitch to editors & site owners" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl border border-ink-800 bg-ink-900 p-4">
              <Icon className="h-5 w-5 text-violet-400 mb-2" />
              <p className="text-sm font-semibold mb-0.5">{label}</p>
              <p className="text-xs text-ink-400">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
