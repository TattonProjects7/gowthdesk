"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingDown, Radar, ListChecks } from "lucide-react";

const LINKS = [
  { href: "/", label: "Scanner", icon: Radar },
  { href: "/tracker", label: "My shorts", icon: ListChecks },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/85 backdrop-blur px-5 sm:px-8 py-3.5 flex items-center gap-3">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
          <TrendingDown className="h-5 w-5" />
        </div>
        <span className="font-bold text-lg tracking-tight text-white">Shortlist</span>
      </Link>
      <span className="hidden sm:inline ml-1 rounded-full bg-rose-950 px-2.5 py-0.5 text-xs text-rose-300 border border-rose-900">
        risk small · win big
      </span>
      <nav className="ml-auto flex items-center gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-ink-800 text-white" : "text-ink-300 hover:text-white hover:bg-ink-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
