import Link from "next/link";
import {
  Ruler, Box, BrickWall, Waves, Weight, ArrowLeftRight, ArrowRight,
} from "lucide-react";
import { TOOLS, ACCENT } from "@/lib/sitecalc/tools";

const ICONS = { Ruler, Box, BrickWall, Waves, Weight, ArrowLeftRight } as const;

export default function SiteCalcHub() {
  return (
    <div>
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          The calculators engineers actually use on site
        </h1>
        <p className="mt-3 text-ink-300">
          Six fast, no-nonsense tools for construction and general engineering.
          Work out beam loads, concrete and masonry quantities, drainage falls and
          metal weights — then convert units without leaving the page. Everything
          runs in your browser, so it works on a phone with no signal.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const Icon = ICONS[t.icon as keyof typeof ICONS];
          const a = ACCENT[t.accent];
          return (
            <Link
              key={t.slug}
              href={`/sitecalc/${t.slug}`}
              className="group rounded-2xl border border-ink-800 bg-ink-900 p-5 transition-all hover:border-ink-600 hover:bg-ink-800"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-ink-950 ${a.text}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <ArrowRight className="h-4 w-4 text-ink-600 transition-all group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
              <h2 className="font-bold">{t.name}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-400">{t.tagline}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
