import Link from "next/link";
import { TrendingDown } from "lucide-react";

// Lightweight server-rendered wrapper for legal pages (no client hooks).
export default function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <header className="border-b border-ink-800 px-5 sm:px-8 py-3.5 flex items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
            <TrendingDown className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Shortlist</span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 sm:px-8 py-12">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">Last updated {updated}</p>
        <div className="mt-8 space-y-6 text-ink-300 leading-relaxed [&_h2]:text-white [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-8 [&_h2]:mb-2 [&_a]:text-rose-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>

        <div className="mt-12 border-t border-ink-800 pt-6 flex gap-5 text-sm text-ink-400">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
        </div>
      </main>
    </div>
  );
}
