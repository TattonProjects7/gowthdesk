"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

export interface SheetGroup {
  heading: string;
  rows: [string, string][];
}

/** On-screen control bar (hidden in print): project reference + Print button. */
export function PrintBar({
  projectRef, onRef,
}: {
  projectRef: string;
  onRef: (v: string) => void;
}) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900 p-2">
      <input
        value={projectRef}
        onChange={(e) => onRef(e.target.value)}
        placeholder="Project / job reference (for the printout)"
        className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white outline-none focus:border-ink-500"
      />
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-400"
      >
        <Printer className="h-4 w-4" /> Print / Save PDF
      </button>
    </div>
  );
}

/** Clean black-on-white calculation sheet, shown only when printing. */
export function CalcSheet({
  title, subtitle, projectRef, groups, disclaimer,
}: {
  title: string;
  subtitle?: string;
  projectRef: string;
  groups: SheetGroup[];
  disclaimer: string;
}) {
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
  }, []);

  return (
    <div className="print-only text-black">
      <div className="mb-4 flex items-start justify-between border-b-2 border-black pb-2">
        <div>
          <p className="text-lg font-bold">SiteCalc — {title}</p>
          {subtitle && <p className="text-sm">{subtitle}</p>}
        </div>
        <div className="text-right text-xs">
          <p><b>Ref:</b> {projectRef || "—"}</p>
          <p><b>Date:</b> {date}</p>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.heading} className="mb-3">
          <p className="mb-1 text-sm font-bold uppercase tracking-wide">{g.heading}</p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {g.rows.map(([k, v], i) => (
                <tr key={i} className="border-b border-gray-300">
                  <td className="py-1 pr-4 align-top text-gray-700">{k}</td>
                  <td className="py-1 text-right font-mono font-medium">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <p className="mt-4 border-t border-gray-400 pt-2 text-[10px] leading-snug text-gray-600">
        {disclaimer}
      </p>
    </div>
  );
}
