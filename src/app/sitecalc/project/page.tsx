"use client";

import { useEffect, useState } from "react";
import { Printer, Trash2, FileText, Beaker } from "lucide-react";
import {
  SavedMember, loadMembers, removeMember, clearMembers,
} from "@/lib/sitecalc/project-store";
import { CalcSheet } from "@/components/sitecalc/CalcSheet";

export default function ProjectPage() {
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [jobRef, setJobRef] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    setMembers(loadMembers());
    setDate(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900 p-2">
        <input
          value={jobRef}
          onChange={(e) => setJobRef(e.target.value)}
          placeholder="Job / project title (for the printout)"
          className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white outline-none focus:border-ink-500"
        />
        {members.length > 0 && (
          <>
            <button onClick={() => { if (confirm("Remove all saved members?")) setMembers(clearMembers()); }}
              className="rounded-lg border border-ink-700 px-3 py-2 text-sm text-ink-300 hover:bg-ink-800">Clear all</button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-400">
              <Printer className="h-4 w-4" /> Print whole job
            </button>
          </>
        )}
      </div>

      {/* Screen view: list of saved members */}
      <div className="no-print">
        <h1 className="mb-1 text-2xl font-bold">Job calculations</h1>
        <p className="mb-5 text-sm text-ink-400">
          Designs you save from the Beam and Column tools collect here. Print the
          whole job as one PDF for the file or building control.
        </p>
        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-700 py-16 text-center">
            <Beaker className="h-10 w-10 text-ink-600" />
            <p className="font-semibold text-ink-200">No saved members yet</p>
            <p className="max-w-sm text-sm text-ink-400">
              Open the Beam or Column designer, size a member, give it a reference
              (e.g. B1) and press <b>Save to job</b>.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-900 p-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.kind === "beam" ? "bg-amber-950 text-amber-400" : "bg-rose-950 text-rose-400"}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.ref && <span className="mr-2 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-xs text-ink-200">{m.ref}</span>}
                    {m.title}
                  </p>
                  <p className="truncate text-xs text-ink-400">{m.subtitle}</p>
                </div>
                <span className="shrink-0 rounded-full bg-ink-800 px-2 py-0.5 text-[11px] uppercase text-ink-300">{m.kind}</span>
                <button onClick={() => setMembers(removeMember(m.id))} title="Remove" className="shrink-0 text-ink-500 hover:text-rose-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print view: a cover sheet + every member's calc sheet */}
      {members.length > 0 && (
        <div className="print-only text-black">
          <div className="mb-6 border-b-2 border-black pb-2">
            <p className="text-xl font-bold">SiteCalc — Job Calculations</p>
            <p className="text-sm">{jobRef || "Untitled job"} · {date} · {members.length} member{members.length > 1 ? "s" : ""}</p>
          </div>
          {members.map((m) => (
            <div key={m.id} style={{ breakInside: "avoid", marginBottom: "18px" }}>
              <CalcSheet
                title={`${m.kind === "beam" ? "Beam" : "Column"} ${m.ref ? `— ${m.ref}` : ""}`}
                subtitle={`${m.title} · ${m.subtitle}`}
                projectRef={jobRef}
                groups={m.groups}
                disclaimer="Indicative simplified checks (BS 5950). Not a substitute for a qualified structural engineer's design."
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
