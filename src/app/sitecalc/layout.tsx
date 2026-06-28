import Link from "next/link";
import { HardHat } from "lucide-react";
import { ToolNav } from "@/components/sitecalc/ToolNav";

export const metadata = {
  title: "SiteCalc — Engineering Field Toolbox",
  description:
    "Fast, free engineering calculators for construction and general engineering: beam loads, concrete, masonry, drainage falls, metal weights and unit conversion.",
};

export default function SiteCalcLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="no-print sticky top-0 z-10 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/sitecalc" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-ink-950">
              <HardHat className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">SiteCalc</span>
          </Link>
          <span className="hidden rounded-full bg-ink-800 px-2.5 py-0.5 text-xs text-ink-300 sm:inline">
            Engineering field toolbox
          </span>
        </div>
        <ToolNav />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="no-print mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-ink-500 sm:px-6">
        SiteCalc gives quick indicative figures for planning and estimating. Always
        verify against the relevant standards (e.g. Eurocodes, Building Regs) and
        have structural elements checked by a qualified engineer before construction.
      </footer>
    </div>
  );
}
