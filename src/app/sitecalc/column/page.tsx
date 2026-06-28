"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { SECTIONS, STEEL_GRADES, Section } from "@/lib/sitecalc/sections";
import {
  ColumnParams, checkColumn, autoSizeColumn, ColumnCheck,
  END_CONDITIONS, STRUT_CURVES,
} from "@/lib/sitecalc/column-design";
import { Card, Field, Result, SelectField, fmt } from "@/components/sitecalc/ui";
import { PrintBar, CalcSheet } from "@/components/sitecalc/CalcSheet";

export default function ColumnPage() {
  const [p, setP] = useState<ColumnParams>({
    height: 3, axial: 500, moment: 0, py: 275, k: 1.0, a: 5.5,
  });
  const [projectRef, setProjectRef] = useState("");
  const [types, setTypes] = useState<Record<"UB" | "UC" | "PFC", boolean>>({
    UB: false, UC: true, PFC: false,
  });
  const [override, setOverride] = useState<string | null>(null);

  const set = (key: keyof ColumnParams) => (v: number) =>
    setP((s) => ({ ...s, [key]: v }));

  const candidates = useMemo(() => SECTIONS.filter((s) => types[s.type]), [types]);
  const { best, alternatives } = useMemo(() => autoSizeColumn(candidates, p), [candidates, p]);

  const shown: Section | null = useMemo(() => {
    if (override) return SECTIONS.find((s) => s.name === override) ?? best?.section ?? null;
    return best?.section ?? null;
  }, [override, best]);

  const check: ColumnCheck | null = useMemo(
    () => (shown ? checkColumn(shown, p) : null),
    [shown, p],
  );

  return (
    <>
    <div className="space-y-4">
    <PrintBar projectRef={projectRef} onRef={setProjectRef} />
    <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="space-y-4">
        <Card title="Column & load">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (L)" unit="m" value={p.height} onChange={set("height")} min={0} />
            <Field label="Axial load (N)" unit="kN" value={p.axial} onChange={set("axial")} min={0} />
            <div className="col-span-2">
              <Field label="Applied moment (Mx)" unit="kNm" value={p.moment} onChange={set("moment")} min={0} />
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-500">Add a moment for an eccentric beam reaction (≈ reaction × eccentricity) to check combined axial + bending.</p>
        </Card>

        <Card title="Design settings">
          <div className="space-y-3">
            <SelectField
              label="End conditions (effective length)"
              value={String(p.k)}
              onChange={(v) => set("k")(parseFloat(v))}
              options={END_CONDITIONS.map((e) => ({ value: String(e.k), label: e.label }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Steel grade"
                value={String(p.py)}
                onChange={(v) => set("py")(parseFloat(v))}
                options={STEEL_GRADES.map((g) => ({ value: String(g.py), label: `${g.name} (${g.py})` }))}
              />
              <SelectField
                label="Strut curve"
                value={String(p.a)}
                onChange={(v) => set("a")(parseFloat(v))}
                options={STRUT_CURVES.map((c) => ({ value: String(c.a), label: c.label }))}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-300">Consider section types</span>
              <div className="flex gap-2">
                {(["UC", "UB", "PFC"] as const).map((t) => (
                  <button key={t} onClick={() => setTypes((s) => ({ ...s, [t]: !s[t] }))}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                      types[t] ? "border-amber-600 bg-amber-950/40 text-amber-300" : "border-ink-700 text-ink-400 hover:bg-ink-800"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {best ? (
          <div className="rounded-2xl border border-amber-600/60 bg-gradient-to-br from-amber-950/40 to-ink-900 p-5">
            <div className="mb-3 flex items-center gap-2 text-amber-300">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Suggested post — lightest that passes</span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-3xl font-bold text-white">{best.section.name} <span className="text-lg text-amber-300">{best.section.type}</span></p>
                <p className="mt-1 text-sm text-ink-300">{best.section.mass} kg/m · {fmt(best.section.D, 1)}×{fmt(best.section.B, 1)} mm</p>
              </div>
              <div className="rounded-lg bg-ink-950/60 px-3 py-1.5 text-center">
                <p className="text-[10px] uppercase text-ink-500">Utilisation</p>
                <p className={`font-mono text-sm font-semibold ${best.util > 0.85 ? "text-amber-300" : "text-emerald-400"}`}>{fmt(best.util * 100, 0)}%</p>
              </div>
            </div>
            {alternatives.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-3">
                <span className="text-xs text-ink-500">Heavier options:</span>
                {alternatives.map((a) => (
                  <button key={a.section.name} onClick={() => setOverride(a.section.name)}
                    className="rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-200 hover:bg-ink-800">
                    {a.section.name} ({a.section.mass} kg/m)
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Card>
            <div className="flex items-center gap-3 text-rose-300">
              <XCircle className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-semibold">No section in the selected range is adequate</p>
                <p className="text-sm text-ink-400">Reduce the load/height, improve end fixity, use S355, or enable larger UC sections.</p>
              </div>
            </div>
          </Card>
        )}

        <Card title="Capacity check">
          <div className="mb-4">
            <SelectField
              label="Section (defaults to the suggestion)"
              value={override ?? best?.section.name ?? ""}
              onChange={(v) => setOverride(v)}
              options={[
                ...(best ? [{ value: best.section.name, label: `${best.section.name} ${best.section.type} — suggested` }] : []),
                ...SECTIONS.filter((s) => s.name !== best?.section.name).map((s) => ({ value: s.name, label: `${s.name} ${s.type} (${s.mass} kg/m)` })),
              ]}
            />
          </div>
          {check ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Result label="Slenderness λ" value={fmt(check.slenderness, 0)} />
                <Result label="Strength pc" value={fmt(check.pc, 0)} unit="N/mm²" />
                <Result label="Resistance Pc" value={fmt(check.Pc, 0)} unit="kN" />
                <Result label="Moment cap. Mcx" value={fmt(check.Mcx, 0)} unit="kNm" />
              </div>
              {p.moment > 0 && (
                <div className="mt-3 rounded-lg border border-ink-800 bg-ink-950/60 px-4 py-2 font-mono text-sm">
                  <span className="text-ink-400">Interaction: </span>
                  <span className="text-white">N/Pc</span> ({fmt(check.axialUtil * 100, 0)}%) +{" "}
                  <span className="text-white">Mx/Mcx</span> ({fmt(check.momentUtil * 100, 0)}%) ={" "}
                  <span className={check.util > 1 ? "text-rose-400" : "text-emerald-400"}>{fmt(check.util * 100, 0)}%</span>
                </div>
              )}
              <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                check.pass ? "bg-emerald-950/50 text-emerald-300" : "bg-rose-950/50 text-rose-300"
              }`}>
                {check.pass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {check.pass
                  ? `Adequate — ${fmt(check.util * 100, 0)}% utilised${p.moment > 0 ? " (combined)" : ""}`
                  : `Not adequate — ${fmt(check.util * 100, 0)}% (overstressed)`}
              </div>
              {check.slenderness > 180 && (
                <p className="mt-2 text-xs text-amber-400">λ &gt; 180 — very slender; BS 5950 limits load-bearing members to λ ≤ 180.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-400">Select at least one section type.</p>
          )}
        </Card>

        {shown && (
          <Card title={`Exact dimensions — ${shown.name} ${shown.type}`}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {[
                ["Mass", `${shown.mass} kg/m`],
                ["Depth D", `${fmt(shown.D, 1)} mm`],
                ["Width B", `${fmt(shown.B, 1)} mm`],
                ["Web tw", `${fmt(shown.tw, 1)} mm`],
                ["Flange tf", `${fmt(shown.tf, 1)} mm`],
                ["Area", `${fmt(shown.A, 1)} cm²`],
                ["ry (minor)", `${fmt(shown.ry, 2)} cm`],
                ["Effective LE", `${fmt(p.k * p.height, 2)} m`],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[11px] text-ink-500">{k}</p>
                  <p className="font-mono text-sm text-white">{v}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <p className="text-xs text-ink-500">
          Compression buckling (Perry-Robertson, BS 5950) with a simplified
          axial+bending interaction (N/Pc + Mx/Mcx ≤ 1). Lateral-torsional
          buckling of the moment term, local buckling and baseplate/connection
          design are not checked. Confirm with a qualified structural engineer.
        </p>
      </div>
    </div>

    {shown && check && (
      <CalcSheet
        title="Column Design"
        subtitle={`${shown.name} ${shown.type} — ${fmt(p.height, 2)} m, LE = ${fmt(p.k * p.height, 2)} m`}
        projectRef={projectRef}
        groups={[
          { heading: "Loading", rows: [
            ["Height L", `${fmt(p.height, 2)} m`],
            ["Axial load N", `${fmt(p.axial, 1)} kN`],
            ["Applied moment Mx", `${fmt(p.moment, 1)} kNm`],
            ["Effective length LE", `${fmt(p.k * p.height, 2)} m (k = ${p.k})`],
            ["Steel grade", `py = ${p.py} N/mm²`],
          ]},
          { heading: `Section ${shown.name} ${shown.type}`, rows: [
            ["Mass", `${shown.mass} kg/m`],
            ["Depth × Width", `${fmt(shown.D, 1)} × ${fmt(shown.B, 1)} mm`],
            ["Area", `${fmt(shown.A, 1)} cm²`],
            ["ry (minor axis)", `${fmt(shown.ry, 2)} cm`],
          ]},
          { heading: "Compression check", rows: [
            ["Slenderness λ = LE/ry", `${fmt(check.slenderness, 0)}`],
            ["Compressive strength pc", `${fmt(check.pc, 0)} N/mm²`],
            ["Resistance Pc", `${fmt(check.Pc, 0)} kN`],
            ["Axial N/Pc", `${fmt(check.axialUtil * 100, 0)}%`],
            ...(p.moment > 0 ? [
              ["Moment capacity Mcx", `${fmt(check.Mcx, 0)} kNm`] as [string, string],
              ["Moment Mx/Mcx", `${fmt(check.momentUtil * 100, 0)}%`] as [string, string],
              ["Interaction N/Pc + Mx/Mcx", `${fmt(check.util * 100, 0)}%`] as [string, string],
            ] : []),
            ["Result", check.pass ? "PASS" : "FAIL — overstressed"],
          ]},
        ]}
        disclaimer="Indicative compression buckling (Perry-Robertson, BS 5950) with a simplified axial+bending interaction. Lateral-torsional buckling of the moment term, local buckling and connection/baseplate design are not checked. Not a substitute for a qualified structural engineer's design."
      />
    )}
    </div>
    </>
  );
}
