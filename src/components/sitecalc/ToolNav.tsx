"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOOLS } from "@/lib/sitecalc/tools";

export function ToolNav() {
  const pathname = usePathname();
  return (
    <nav className="border-t border-ink-800/70">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-1.5 sm:px-4">
        {TOOLS.map((t) => {
          const href = `/sitecalc/${t.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={t.slug}
              href={href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-ink-800 font-semibold text-white"
                  : "text-ink-300 hover:bg-ink-900 hover:text-white"
              }`}
            >
              {t.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
