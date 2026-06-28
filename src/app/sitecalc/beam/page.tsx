"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import {
  SECTIONS, STEEL_GRADES, DEFLECTION_LIMITS, Section,
} from "@/lib/sitecalc/sections";
import {
  DesignParams, serviceEffects, checkSection, autoSize, SectionCheck, analysisFor,
} from "@/lib/sitecalc/beam-design";
import { BEAM_CONFIGS, configGeometry } from "@/lib/sitecalc/beam-fe";
import {
  checkBearing, BEARING_PRESETS, STANDARD_PADSTONES, BearingResult,
} from "@/lib/sitecalc/bearing";
import {
  LoadBuildup, buildUdl, DEAD_PRESETS, IMPOSED_PRESETS,
} from "@/lib/sitecalc/loads";
import { saveMember } from "@/lib/sitecalc/project-store";
import { SheetGroup } from "@/components/sitecalc/CalcSheet";
import { Card, Field, Result, SelectField, fmt } from "@/components/sitecalc/ui";
import { PrintBar, CalcSheet } from "@/components/sitecalc/CalcSheet";

export default function BeamPage() {
  const [p, setP] = useState<DesignParams>({
    config: "simple", span: 5, udl: 15, pointLoad: 0, pointPos: 2.5,
    E: 210, py: 275, gammaF: 1.5, deflDenom: 360,
  });
  const [types, setTypes] = useState<Record<"UB" | "UC" | "PFC", boolean>>({
    UB: true, UC: false, PFC: false,
  });
  const [override, setOverride] = useState<string | null>(null); // null = use suggested
  const [projectRef, setProjectRef] = useState("");
  const [bearing, setBearing] = useState({ width: 100, length: 150, allow: 3.5 });
  const [loads, setLoads] = useState<LoadBuildup | null>(null); // null = enter UDL directly
  const [saved, setSaved] = useState(false);

  const set = (k: keyof DesignParams) => (v: number) =>
    setP((s) => ({ ...s, [k]: v }));

  const svc = useMemo(() => serviceEffects(p), [p]);

  const candidates = useMemo(
    () => SECTIONS.filter((s) => types[s.type]),
    [types],
  );
  const { best, alternatives } = useMemo(
    () => autoSize(candidates, p, svc),
    [candidates, p, svc],
  );

  // Section currently shown in the check panel / diagrams.
  const shown: Section | null = useMemo(() => {
    if (override) return SECTIONS.find((s) => s.name === override) ?? best?.section ?? null;
    return best?.section ?? null;
  }, [override, best]);

  const check: SectionCheck | null = useMemo(
    () => (shown ? checkSection(shown, p, svc) : null),
    [shown, p, svc],
  );

  const solved = useMemo(() => analysisFor(p, shown?.Ix ?? 10000), [shown, p]);

  // End-bearing / padstone check uses the largest ULS reaction.
  const maxReaction = svc.reactions.reduce((m, r) => Math.max(m, r.R), 0);
  const ulsReaction = maxReaction * p.gammaF;
  const bearingResult = useMemo(
    () => checkBearing({ reaction: ulsReaction, ...bearing }),
    [ulsReaction, bearing],
  );

  const configLabel = BEAM_CONFIGS.find((c) => c.value === p.config)?.label ?? "";
  const supports = configGeometry(p.config, p.span).supports;

  const sheetGroups: SheetGroup[] | null = shown && check ? [
    { heading: "Loading (service)", rows: [
      ["Configuration", configLabel],
      ["Span L", `${fmt(p.span, 2)} m`],
      ["UDL w", `${fmt(p.udl, 2)} kN/m`],
      ["Point load P", `${fmt(p.pointLoad, 1)} kN @ ${fmt(p.pointPos, 2)} m`],
      ["Steel grade", `py = ${p.py} N/mm²`],
      ["Load factor γf", `${fmt(p.gammaF, 2)}`],
    ]},
    { heading: "Effects", rows: [
      ["Reactions", `${svc.reactions.map((r) => fmt(r.R, 1)).join(" / ")} kN`],
      ["Max shear V (service)", `${fmt(svc.Vs, 1)} kN`],
      ["Max moment M (service)", `${fmt(svc.Ms, 1)} kNm`],
      ["Bending stress σ", `${fmt(check.bendStress, 0)} N/mm²`],
    ]},
    { heading: `Section ${shown.name} ${shown.type}`, rows: [
      ["Mass", `${shown.mass} kg/m`],
      ["Depth D × Width B", `${fmt(shown.D, 1)} × ${fmt(shown.B, 1)} mm`],
      ["Web tw / Flange tf", `${fmt(shown.tw, 1)} / ${fmt(shown.tf, 1)} mm`],
      ["Ix / Wpl,y", `${fmt(shown.Ix, 0)} cm⁴ / ${fmt(shown.Wpl, 0)} cm³`],
    ]},
    { heading: "Capacity checks", rows: [
      ["Bending Med / Mc", `${fmt(check.Med, 1)} / ${fmt(check.Mc, 1)} kNm  (${fmt(check.bendUtil * 100, 0)}%)`],
      ["Shear Ved / Pv", `${fmt(check.Ved, 1)} / ${fmt(check.Pv, 1)} kN  (${fmt(check.shearUtil * 100, 0)}%)`],
      ["Deflection δ / limit", `${fmt(check.defl, 1)} / ${fmt(check.deflLimit, 1)} mm  (${fmt(check.deflUtil * 100, 0)}%)`],
      ["Result", check.pass ? `PASS — governed by ${check.governs.toLowerCase()}` : `FAIL — ${check.governs.toLowerCase()}`],
    ]},
    { heading: "End bearing", rows: [
      ["ULS reaction", `${fmt(ulsReaction, 1)} kN`],
      ["Padstone (W × L)", `${fmt(bearing.width, 0)} × ${fmt(bearing.length, 0)} mm`],
      ["Bearing stress / allowable", `${fmt(bearingResult.stress, 2)} / ${fmt(bearing.allow, 2)} N/mm²  (${fmt(bearingResult.util * 100, 0)}%)`],
      ["Bearing result", bearingResult.pass ? "PASS" : "FAIL"],
    ]},
  ] : null;

  const onSave = () => {
    if (!shown || !sheetGroups) return;
    saveMember({
      kind: "beam",
      title: `${shown.name} ${shown.type}`,
      subtitle: `${configLabel} — ${fmt(p.span, 2)} m span`,
      ref: projectRef,
      groups: sheetGroups,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
    <div className="space-y-4">
    <PrintBar projectRef={projectRef} onRef={setProjectRef} onSave={onSave} saved={saved} jobHref="/sitecalc/project" />
    <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      {/* Inputs */}
      <div className="space-y-4">
        <Card title="Span & loading (service loads)">
          <div className="mb-3">
            <SelectField
              label="Beam configuration"
              value={p.config}
              onChange={(v) => setP((s) => ({ ...s, config: v as DesignParams["config"] }))}
              options={BEAM_CONFIGS.map((c) => ({ value: c.value, label: c.label }))}
            />
            {p.config !== "simple" && p.config !== "cantilever" && (
              <p className="mt-1 text-xs text-ink-500">Span is the length of each individual span.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={p.config === "cantilever" ? "Length (L)" : "Span (L)"} unit="m" value={p.span} onChange={set("span")} min={0} />
            <Field label="UDL (w)" unit="kN/m" value={p.udl} onChange={set("udl")} min={0} />
            <Field label="Point load (P)" unit="kN" value={p.pointLoad} onChange={set("pointLoad")} min={0} />
            <Field label="P position" unit="m" value={p.pointPos} onChange={set("pointPos")} min={0} />
          </div>
        </Card>

        <LoadBuilder loads={loads} setLoads={setLoads} onUdl={(u) => set("udl")(u)} />

        <Card title="Design settings">
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Steel grade"
              value={String(p.py)}
              onChange={(v) => set("py")(parseFloat(v))}
              options={STEEL_GRADES.map((g) => ({ value: String(g.py), label: `${g.name} (py=${g.py})` }))}
            />
            <Field label="Load factor γf" value={p.gammaF} onChange={set("gammaF")} min={1} />
            <div className="col-span-2">
              <SelectField
                label="Deflection limit"
                value={String(p.deflDenom)}
                onChange={(v) => set("deflDenom")(parseFloat(v))}
                options={DEFLECTION_LIMITS.map((d) => ({ value: String(d.denom), label: d.label }))}
              />
            </div>
          </div>
          <div className="mt-3">
            <span className="mb-1.5 block text-xs font-medium text-ink-300">Consider section types</span>
            <div className="flex gap-2">
              {(["UB", "UC", "PFC"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypes((s) => ({ ...s, [t]: !s[t] }))}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    types[t]
                      ? "border-amber-600 bg-amber-950/40 text-amber-300"
                      : "border-ink-700 text-ink-400 hover:bg-ink-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Service results">
          <div className="grid grid-cols-2 gap-3">
            <Result label="Max shear (V)" value={fmt(svc.Vs, 1)} unit="kN" />
            <Result label="Max moment (M)" value={fmt(svc.Ms, 1)} unit="kNm" />
            <Result label="ULS moment (γf·M)" value={fmt(svc.Ms * p.gammaF, 1)} unit="kNm" />
            <Result label="Reactions" value={svc.reactions.map((r) => fmt(r.R, 1)).join(" / ")} unit="kN" />
          </div>
        </Card>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <SuggestionCard best={best} alternatives={alternatives} onPick={setOverride} />

        {/* Section selector + checks */}
        <Card title="Section check">
          <div className="mb-4">
            <SelectField
              label="Section (defaults to the suggestion — change to check any size)"
              value={override ?? best?.section.name ?? ""}
              onChange={(v) => setOverride(v)}
              options={[
                ...(best ? [{ value: best.section.name, label: `${best.section.name} ${best.section.type} — suggested` }] : []),
                ...SECTIONS.filter((s) => s.name !== best?.section.name).map((s) => ({
                  value: s.name, label: `${s.name} ${s.type} (${s.mass} kg/m)`,
                })),
              ]}
            />
          </div>
          {check ? <ChecksTable c={check} /> : <p className="text-sm text-ink-400">Select at least one section type to check.</p>}
        </Card>

        {shown && check && <DimensionsCard s={shown} bendStress={check.bendStress} />}

        <BearingCard
          shown={shown}
          ulsReaction={ulsReaction}
          bearing={bearing}
          setBearing={setBearing}
          result={bearingResult}
        />

        {/* Diagrams */}
        <Card title={`Diagrams — ${configLabel}`}>
          <BeamDiagram p={p} supports={supports} length={solved.samples.length ? solved.samples[solved.samples.length - 1].x : p.span} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MiniChart title="Shear force" unit="kN" color="#38bdf8" samples={solved.samples.map((s) => ({ x: s.x, y: s.shear }))} span={configGeometry(p.config, p.span).length} />
            <MiniChart title="Bending moment" unit="kNm" color="#f59e0b" samples={solved.samples.map((s) => ({ x: s.x, y: s.moment }))} span={configGeometry(p.config, p.span).length} flip />
            <MiniChart title="Deflection" unit="mm" color={check?.deflUtil != null && check.deflUtil > 1 ? "#fb7185" : "#34d399"} samples={solved.samples.map((s) => ({ x: s.x, y: s.defl }))} span={configGeometry(p.config, p.span).length} flip />
          </div>
        </Card>

        <p className="text-xs text-ink-500">
          Simplified BS 5950 elastic/plastic checks for a laterally-restrained
          beam (FE analysis for the chosen configuration). Section properties are
          indicative. Lateral-torsional buckling, web bearing/buckling, bolts and
          connections are not checked — have the design confirmed by a qualified
          structural engineer.
        </p>
      </div>
    </div>

    {sheetGroups && shown && (
      <CalcSheet
        title="Beam Design"
        subtitle={`${shown.name} ${shown.type} — ${configLabel}, ${fmt(p.span, 2)} m span`}
        projectRef={projectRef}
        groups={sheetGroups}
        disclaimer="Indicative simplified BS 5950 checks (laterally-restrained beam, FE analysis). Section properties are nominal. Lateral-torsional buckling, web bearing/buckling and connections are not checked. Not a substitute for a qualified structural engineer's design."
      />
    )}
    </div>
    </>
  );
}

function BearingCard({ shown, ulsReaction, bearing, setBearing, result }: {
  shown: Section | null;
  ulsReaction: number;
  bearing: { width: number; length: number; allow: number };
  setBearing: (b: { width: number; length: number; allow: number }) => void;
  result: BearingResult;
}) {
  return (
    <Card title="End bearing / padstone">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="ULS reaction" unit="kN" value={ulsReaction} onChange={() => {}} />
        <Field label="Bearing width" unit="mm" value={bearing.width} onChange={(v) => setBearing({ ...bearing, width: v })} min={0} />
        <Field label="Bearing length" unit="mm" value={bearing.length} onChange={(v) => setBearing({ ...bearing, length: v })} min={0} />
        <div className="col-span-2">
          <SelectField
            label="Support material (allowable bearing)"
            value={String(bearing.allow)}
            onChange={(v) => setBearing({ ...bearing, allow: parseFloat(v) })}
            options={BEARING_PRESETS.map((m) => ({ value: String(m.stress), label: `${m.name} — ${m.stress} N/mm²` }))}
          />
        </div>
        <Field label="Allowable" unit="N/mm²" value={bearing.allow} onChange={(v) => setBearing({ ...bearing, allow: v })} min={0} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-500">Standard padstones:</span>
        {STANDARD_PADSTONES.map((s) => {
          const [w, l] = s.split("×").map(Number);
          return (
            <button key={s} onClick={() => setBearing({ ...bearing, width: w, length: l })}
              className="rounded-full border border-ink-700 px-2.5 py-0.5 text-xs text-ink-200 hover:bg-ink-800">{s}</button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Result label="Bearing stress" value={fmt(result.stress, 2)} unit="N/mm²" />
        <Result label="Min length needed" value={fmt(result.reqLength, 0)} unit="mm" />
        <Result label="Utilisation" value={fmt(result.util * 100, 0)} unit="%" accent={result.pass ? "text-emerald-400" : "text-rose-400"} />
      </div>
      <p className="mt-2 text-xs text-ink-500">
        {shown ? `Default bearing width matches a ${fmt(shown.B, 0)} mm flange. ` : ""}
        Allowable bearing on masonry varies with unit strength and edge distance — confirm to BS 5628/EC6.
      </p>
    </Card>
  );
}

function SuggestionCard({ best, alternatives, onPick }: {
  best: SectionCheck | null;
  alternatives: SectionCheck[];
  onPick: (name: string) => void;
}) {
  if (!best) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-rose-300">
          <XCircle className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">No section in the selected range is adequate</p>
            <p className="text-sm text-ink-400">Reduce the span/load, relax the deflection limit, use S355, or enable deeper UB sections.</p>
          </div>
        </div>
      </Card>
    );
  }
  const s = best.section;
  return (
    <div className="rounded-2xl border border-amber-600/60 bg-gradient-to-br from-amber-950/40 to-ink-900 p-5">
      <div className="mb-3 flex items-center gap-2 text-amber-300">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Suggested section — lightest that passes</span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-3xl font-bold text-white">{s.name} <span className="text-lg text-amber-300">{s.type}</span></p>
          <p className="mt-1 text-sm text-ink-300">{s.mass} kg/m · depth {fmt(s.D, 1)} mm · width {fmt(s.B, 1)} mm</p>
        </div>
        <div className="flex gap-2 text-center">
          <Util label="Bending" v={best.bendUtil} />
          <Util label="Shear" v={best.shearUtil} />
          <Util label="Defl" v={best.deflUtil} />
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-400">
        Governed by <b className="text-ink-200">{best.governs.toLowerCase()}</b> at {fmt(best.governUtil * 100, 0)}% utilisation.
      </p>
      {alternatives.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-3">
          <span className="text-xs text-ink-500">Heavier options:</span>
          {alternatives.map((a) => (
            <button key={a.section.name} onClick={() => onPick(a.section.name)}
              className="rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-200 hover:bg-ink-800">
              {a.section.name} ({a.section.mass} kg/m)
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Util({ label, v }: { label: string; v: number }) {
  const pct = v * 100;
  const col = v > 1 ? "text-rose-400" : v > 0.85 ? "text-amber-300" : "text-emerald-400";
  return (
    <div className="rounded-lg bg-ink-950/60 px-3 py-1.5">
      <p className="text-[10px] uppercase text-ink-500">{label}</p>
      <p className={`font-mono text-sm font-semibold ${col}`}>{fmt(pct, 0)}%</p>
    </div>
  );
}

function ChecksTable({ c }: { c: SectionCheck }) {
  const rows = [
    { name: "Bending", demand: `${fmt(c.Med, 1)} kNm`, cap: `${fmt(c.Mc, 1)} kNm`, util: c.bendUtil },
    { name: "Shear", demand: `${fmt(c.Ved, 1)} kN`, cap: `${fmt(c.Pv, 1)} kN`, util: c.shearUtil },
    { name: "Deflection", demand: `${fmt(c.defl, 1)} mm`, cap: `${fmt(c.deflLimit, 1)} mm`, util: c.deflUtil },
  ];
  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-sm">
        <div className="text-xs font-semibold uppercase text-ink-500">Check</div>
        <div className="text-right text-xs font-semibold uppercase text-ink-500">Demand</div>
        <div className="text-right text-xs font-semibold uppercase text-ink-500">Capacity</div>
        <div className="text-right text-xs font-semibold uppercase text-ink-500">Util.</div>
        {rows.map((r) => (
          <Row key={r.name} {...r} />
        ))}
      </div>
      <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
        c.pass ? "bg-emerald-950/50 text-emerald-300" : "bg-rose-950/50 text-rose-300"
      }`}>
        {c.pass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {c.pass ? `Adequate — governed by ${c.governs.toLowerCase()} (${fmt(c.governUtil * 100, 0)}%)` : `Not adequate — ${c.governs.toLowerCase()} at ${fmt(c.governUtil * 100, 0)}%`}
      </div>
    </div>
  );
}

function Row({ name, demand, cap, util }: { name: string; demand: string; cap: string; util: number }) {
  const col = util > 1 ? "text-rose-400" : util > 0.85 ? "text-amber-300" : "text-emerald-400";
  return (
    <>
      <div className="border-t border-ink-800 py-1.5 text-ink-200">{name}</div>
      <div className="border-t border-ink-800 py-1.5 text-right font-mono text-ink-300">{demand}</div>
      <div className="border-t border-ink-800 py-1.5 text-right font-mono text-ink-300">{cap}</div>
      <div className={`border-t border-ink-800 py-1.5 text-right font-mono font-semibold ${col}`}>{fmt(util * 100, 0)}%</div>
    </>
  );
}

function DimensionsCard({ s, bendStress }: { s: Section; bendStress: number }) {
  const items = [
    ["Mass", `${s.mass} kg/m`],
    ["Depth D", `${fmt(s.D, 1)} mm`],
    ["Width B", `${fmt(s.B, 1)} mm`],
    ["Web tw", `${fmt(s.tw, 1)} mm`],
    ["Flange tf", `${fmt(s.tf, 1)} mm`],
    ["Area", `${fmt(s.A, 1)} cm²`],
    ["Ix", `${fmt(s.Ix, 0)} cm⁴`],
    ["Wel,y", `${fmt(s.Wel, 0)} cm³`],
    ["Wpl,y", `${fmt(s.Wpl, 0)} cm³`],
    ["Bending stress σ", `${fmt(bendStress, 0)} N/mm²`],
  ];
  return (
    <Card title={`Exact dimensions — ${s.name} ${s.type}`}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
        {items.map(([k, v]) => (
          <div key={k}>
            <p className="text-[11px] text-ink-500">{k}</p>
            <p className="font-mono text-sm text-white">{v}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MiniChart({ title, unit, color, samples, span, flip }: {
  title: string; unit: string; color: string;
  samples: { x: number; y: number }[]; span: number; flip?: boolean;
}) {
  const W = 220, H = 110, padL = 6, padR = 6, padT = 16, padB = 16;
  const maxAbs = Math.max(1e-6, ...samples.map((s) => Math.abs(s.y)));
  const peak = samples.reduce((a, b) => (Math.abs(b.y) > Math.abs(a.y) ? b : a), samples[0] ?? { x: 0, y: 0 });
  const sx = (x: number) => padL + (x / (span || 1)) * (W - padL - padR);
  const sy = (y: number) => {
    const t = y / maxAbs; // -1..1
    const v = flip ? -t : t;
    return padT + ((1 - v) / 2) * (H - padT - padB);
  };
  const zeroY = sy(0);
  const path = samples.map((s, i) => `${i ? "L" : "M"}${sx(s.x).toFixed(1)},${sy(s.y).toFixed(1)}`).join(" ");
  const area = `M${sx(0).toFixed(1)},${zeroY.toFixed(1)} ${samples.map((s) => `L${sx(s.x).toFixed(1)},${sy(s.y).toFixed(1)}`).join(" ")} L${sx(span).toFixed(1)},${zeroY.toFixed(1)} Z`;
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/60 p-3">
      <p className="mb-1 text-xs font-semibold text-ink-200">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path d={area} fill={color} fillOpacity={0.15} />
        <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#3f4666" strokeWidth={1} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        <circle cx={sx(peak.x)} cy={sy(peak.y)} r={2.5} fill={color} />
        <text x={W / 2} y={H - 3} textAnchor="middle" className="fill-ink-500 text-[9px]">L = {span} m</text>
      </svg>
      <p className="text-center font-mono text-xs" style={{ color }}>
        peak {fmt(Math.abs(peak.y), maxAbs < 10 ? 2 : 1)} {unit}
      </p>
    </div>
  );
}

function BeamDiagram({ p, supports, length }: {
  p: DesignParams;
  supports: { x: number; fixity: "pinned" | "fixed" }[];
  length: number;
}) {
  const W = 640, H = 130, m = 40;
  const bx = m, bw = W - 2 * m, by = 64;
  const X = (x: number) => bx + (length > 0 ? (x / length) * bw : 0);
  const px = X(Math.min(p.pointPos, length));
  const hasP = p.pointLoad > 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <rect x={bx} y={by} width={bw} height={8} rx={2} className="fill-ink-300" />
      {supports.map((s, i) => {
        const sx = X(s.x);
        return s.fixity === "fixed" ? (
          // fixed support: hatched wall
          <g key={i}>
            <rect x={sx - 6} y={by - 14} width={6} height={36} className="fill-amber-400" />
            {Array.from({ length: 5 }).map((_, j) => (
              <line key={j} x1={sx - 6} y1={by - 14 + j * 9} x2={sx - 12} y2={by - 14 + j * 9 + 5} className="stroke-amber-400" strokeWidth={1} />
            ))}
          </g>
        ) : (
          <polygon key={i} points={`${sx},${by + 8} ${sx - 9},${by + 26} ${sx + 9},${by + 26}`} className="fill-amber-400" />
        );
      })}
      {p.udl > 0 && Array.from({ length: 9 }).map((_, i) => {
        const x = bx + (i / 8) * bw;
        return <line key={i} x1={x} y1={by - 20} x2={x} y2={by - 2} className="stroke-sky-400" strokeWidth={1.5} markerEnd="url(#bh)" />;
      })}
      {p.udl > 0 && (
        <>
          <line x1={bx} y1={by - 20} x2={bx + bw} y2={by - 20} className="stroke-sky-400" strokeWidth={1.5} />
          <text x={W / 2} y={by - 26} textAnchor="middle" className="fill-sky-300 text-[11px]">{p.udl} kN/m</text>
        </>
      )}
      {hasP && (
        <>
          <line x1={px} y1={by - 38} x2={px} y2={by - 4} className="stroke-rose-400" strokeWidth={2.5} markerEnd="url(#bhr)" />
          <text x={px} y={by - 44} textAnchor="middle" className="fill-rose-300 text-[11px]">{p.pointLoad} kN</text>
        </>
      )}
      <text x={W / 2} y={by + 44} textAnchor="middle" className="fill-ink-400 text-[11px]">Total length {fmt(length, 2)} m</text>
      <defs>
        <marker id="bh" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto"><path d="M0,0 L3,5 L6,0" className="fill-sky-400" /></marker>
        <marker id="bhr" markerWidth="7" markerHeight="7" refX="3.5" refY="6" orient="auto"><path d="M0,0 L3.5,6 L7,0" className="fill-rose-400" /></marker>
      </defs>
    </svg>
  );
}

function LoadBuilder({ loads, setLoads, onUdl }: {
  loads: LoadBuildup | null;
  setLoads: (l: LoadBuildup | null) => void;
  onUdl: (u: number) => void;
}) {
  const active = loads !== null;
  const l = loads ?? { tributary: 3, dead: 0.9, imposed: 1.5, lineLoad: 0 };
  const result = buildUdl(l);
  const update = (patch: Partial<LoadBuildup>) => {
    const next = { ...l, ...patch };
    setLoads(next);
    onUdl(parseFloat(buildUdl(next).totalUdl.toFixed(2)));
  };
  return (
    <Card title="Build the load (optional)">
      {!active ? (
        <button onClick={() => { setLoads(l); onUdl(parseFloat(result.totalUdl.toFixed(2))); }}
          className="w-full rounded-lg border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:bg-ink-800">
          Work out the UDL from area loads →
        </button>
      ) : (
        <div className="space-y-3">
          <Field label="Tributary width" unit="m" value={l.tributary} onChange={(v) => update({ tributary: v })} min={0} />
          <div>
            <SelectField label="Dead load gk" value={String(l.dead)}
              onChange={(v) => update({ dead: parseFloat(v) })}
              options={[...DEAD_PRESETS.map((d) => ({ value: String(d.value), label: `${d.name} — ${d.value}` })),
                ...(DEAD_PRESETS.some((d) => d.value === l.dead) ? [] : [{ value: String(l.dead), label: `Custom — ${l.dead}` }])]} />
            <div className="mt-2"><Field label="…or gk (kN/m²)" unit="kN/m²" value={l.dead} onChange={(v) => update({ dead: v })} min={0} /></div>
          </div>
          <div>
            <SelectField label="Imposed load qk" value={String(l.imposed)}
              onChange={(v) => update({ imposed: parseFloat(v) })}
              options={[...IMPOSED_PRESETS.map((d) => ({ value: String(d.value), label: `${d.name} — ${d.value}` })),
                ...(IMPOSED_PRESETS.some((d) => d.value === l.imposed) ? [] : [{ value: String(l.imposed), label: `Custom — ${l.imposed}` }])]} />
            <div className="mt-2"><Field label="…or qk (kN/m²)" unit="kN/m²" value={l.imposed} onChange={(v) => update({ imposed: v })} min={0} /></div>
          </div>
          <Field label="Extra line load (wall over, etc.)" unit="kN/m" value={l.lineLoad} onChange={(v) => update({ lineLoad: v })} min={0} />
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-ink-950/60 p-2 text-center">
            <div><p className="text-[10px] text-ink-500">Dead</p><p className="font-mono text-sm text-white">{fmt(result.deadUdl, 1)}</p></div>
            <div><p className="text-[10px] text-ink-500">Imposed</p><p className="font-mono text-sm text-white">{fmt(result.imposedUdl, 1)}</p></div>
            <div><p className="text-[10px] text-ink-500">Total UDL</p><p className="font-mono text-sm font-bold text-amber-400">{fmt(result.totalUdl, 1)}</p></div>
          </div>
          <button onClick={() => setLoads(null)} className="text-xs text-ink-500 hover:text-ink-300">Enter UDL manually instead</button>
        </div>
      )}
    </Card>
  );
}
