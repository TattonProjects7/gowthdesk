"use client";

import { useMemo, useState } from "react";
import { solveBeam, BeamInput, STEEL_SECTIONS } from "@/lib/sitecalc/beam";
import { Card, Field, Result, SelectField, fmt } from "@/components/sitecalc/ui";

export default function BeamPage() {
  const [input, setInput] = useState<BeamInput>({
    span: 5,
    udl: 10,
    pointLoad: 0,
    pointPos: 2.5,
    E: 210,
    I: 8503,
  });

  const set = (k: keyof BeamInput) => (v: number) =>
    setInput((s) => ({ ...s, [k]: v }));

  const r = useMemo(() => solveBeam(input), [input]);

  // Deflection limit check (common serviceability limit span/360).
  const limit = (input.span * 1000) / 360;
  const passes = r.maxDeflection <= limit;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-4">
        <Card title="Beam & loading">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Span (L)" unit="m" value={input.span} onChange={set("span")} min={0} />
            <Field label="UDL (w)" unit="kN/m" value={input.udl} onChange={set("udl")} min={0} />
            <Field label="Point load (P)" unit="kN" value={input.pointLoad} onChange={set("pointLoad")} min={0} />
            <Field label="P position" unit="m" value={input.pointPos} onChange={set("pointPos")} min={0} />
          </div>
        </Card>

        <Card title="Section (for deflection)">
          <div className="space-y-3">
            <SelectField
              label="Pick a section"
              value={String(input.I)}
              onChange={(v) => set("I")(parseFloat(v))}
              options={STEEL_SECTIONS.map((s) => ({
                value: String(s.I),
                label: `${s.name}  (I=${s.I} cm⁴)`,
              }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="E (Young's)" unit="GPa" value={input.E} onChange={set("E")} min={0} />
              <Field label="I (2nd moment)" unit="cm⁴" value={input.I} onChange={set("I")} min={0} />
            </div>
            <p className="text-xs text-ink-500">Steel E≈210, aluminium≈69, C24 timber≈11 GPa.</p>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <BeamDiagram input={input} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Result label="Reaction left" value={fmt(r.reactionLeft)} unit="kN" />
          <Result label="Reaction right" value={fmt(r.reactionRight)} unit="kN" />
          <Result label="Max shear" value={fmt(r.maxShear)} unit="kN" />
          <Result label="Max moment" value={fmt(r.maxMoment)} unit="kNm" big accent="text-amber-400" />
          <Result label="at" value={fmt(r.maxMomentPos)} unit="m" />
          <Result
            label="Max deflection"
            value={fmt(r.maxDeflection)}
            unit="mm"
            big
            accent={passes ? "text-emerald-400" : "text-rose-400"}
          />
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-ink-300">
              Deflection ratio:{" "}
              <span className="font-mono text-white">
                {r.spanOverDefl ? `L/${Math.round(r.spanOverDefl)}` : "—"}
              </span>
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                passes ? "bg-emerald-950 text-emerald-300" : "bg-rose-950 text-rose-300"
              }`}
            >
              {passes ? "✓ Within L/360" : "✗ Exceeds L/360 limit"}
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            L/360 ≈ {fmt(limit, 1)} mm is a typical serviceability limit for floor
            beams. Roofs and brittle finishes may use different limits.
          </p>
        </Card>
      </div>
    </div>
  );
}

function BeamDiagram({ input }: { input: BeamInput }) {
  const W = 640, H = 150, m = 40;
  const bx = m, bw = W - 2 * m, by = 70;
  const px = input.span > 0 ? bx + (input.pointPos / input.span) * bw : bx;
  const hasP = input.pointLoad > 0;
  return (
    <Card>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* beam */}
        <rect x={bx} y={by} width={bw} height={8} rx={2} className="fill-ink-300" />
        {/* supports (triangles) */}
        <polygon points={`${bx},${by + 8} ${bx - 9},${by + 26} ${bx + 9},${by + 26}`} className="fill-amber-400" />
        <polygon points={`${bx + bw},${by + 8} ${bx + bw - 9},${by + 26} ${bx + bw + 9},${by + 26}`} className="fill-amber-400" />
        {/* UDL arrows */}
        {input.udl > 0 &&
          Array.from({ length: 9 }).map((_, i) => {
            const x = bx + (i / 8) * bw;
            return <line key={i} x1={x} y1={by - 22} x2={x} y2={by - 2} className="stroke-sky-400" strokeWidth={1.5} markerEnd="url(#ah)" />;
          })}
        {input.udl > 0 && (
          <>
            <line x1={bx} y1={by - 22} x2={bx + bw} y2={by - 22} className="stroke-sky-400" strokeWidth={1.5} />
            <text x={W / 2} y={by - 28} textAnchor="middle" className="fill-sky-300 text-[11px]">{input.udl} kN/m</text>
          </>
        )}
        {/* point load */}
        {hasP && (
          <>
            <line x1={px} y1={by - 40} x2={px} y2={by - 4} className="stroke-rose-400" strokeWidth={2.5} markerEnd="url(#ahr)" />
            <text x={px} y={by - 46} textAnchor="middle" className="fill-rose-300 text-[11px]">{input.pointLoad} kN</text>
          </>
        )}
        {/* span label */}
        <text x={W / 2} y={by + 44} textAnchor="middle" className="fill-ink-400 text-[11px]">L = {input.span} m</text>
        <defs>
          <marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
            <path d="M0,0 L3,5 L6,0" className="fill-sky-400" />
          </marker>
          <marker id="ahr" markerWidth="7" markerHeight="7" refX="3.5" refY="6" orient="auto">
            <path d="M0,0 L3.5,6 L7,0" className="fill-rose-400" />
          </marker>
        </defs>
      </svg>
    </Card>
  );
}
