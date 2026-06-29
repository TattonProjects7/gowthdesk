"use client";

import { useMemo, useState } from "react";
import {
  calcDrainage, DrainInput, DrainSolveFor, RECOMMENDED_GRADIENTS,
} from "@/lib/sitecalc/drainage";
import { Card, Field, Result, SelectField, fmt } from "@/components/sitecalc/ui";

export default function DrainagePage() {
  const [input, setInput] = useState<DrainInput>({
    solveFor: "fall",
    length: 12,
    gradientX: 40,
    fallMm: 300,
    upstreamInvert: 30.5,
  });

  const set = (k: keyof DrainInput) => (v: number) =>
    setInput((s) => ({ ...s, [k]: v }));

  const r = useMemo(() => calcDrainage(input), [input]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-4">
        <Card title="Pipe run">
          <div className="space-y-3">
            <SelectField<DrainSolveFor>
              label="Solve for"
              value={input.solveFor}
              onChange={(v) => setInput((s) => ({ ...s, solveFor: v }))}
              options={[
                { value: "fall", label: "Fall (from gradient)" },
                { value: "gradient", label: "Gradient (from fall)" },
              ]}
            />
            <Field label="Pipe length" unit="m" value={input.length} onChange={set("length")} min={0} />
            {input.solveFor === "fall" ? (
              <Field label="Gradient 1 : X" unit="1:X" value={input.gradientX} onChange={set("gradientX")} min={0} />
            ) : (
              <Field label="Fall" unit="mm" value={input.fallMm} onChange={set("fallMm")} min={0} />
            )}
            <Field label="Upstream invert level" unit="m" value={input.upstreamInvert} onChange={set("upstreamInvert")} />
          </div>
        </Card>

        <Card title="Reg guidance (foul, AD-H)">
          <div className="space-y-2 text-xs">
            {RECOMMENDED_GRADIENTS.map((g) => (
              <div key={g.pipe} className="flex items-baseline justify-between gap-3 border-b border-ink-800 pb-2 last:border-0">
                <span className="text-ink-200">{g.pipe}</span>
                <span className="font-mono text-cyan-400">{g.min}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Result label="Fall over run" value={fmt(r.fallMm, 0)} unit="mm" big accent="text-cyan-400" />
          <Result label="Gradient" value={`1 : ${fmt(r.gradientX, 0)}`} big accent="text-cyan-400" />
          <Result label="Gradient (%)" value={fmt(r.gradientPct, 2)} unit="%" />
          <Result label="Downstream invert" value={fmt(r.downstreamInvert, 3)} unit="m" />
        </div>

        <Card>
          <svg viewBox="0 0 600 160" className="w-full">
            {(() => {
              const x0 = 50, x1 = 550, yTop = 40;
              const drop = Math.min(Math.max(r.fallMm / 1000 / (input.length || 1) * 400, 4), 90);
              const yEnd = yTop + drop;
              return (
                <>
                  <line x1={x0} y1={yTop} x2={x1} y2={yEnd} className="stroke-cyan-400" strokeWidth={6} strokeLinecap="round" />
                  <line x1={x0} y1={20} x2={x0} y2={140} className="stroke-ink-700" strokeDasharray="3 3" />
                  <line x1={x1} y1={20} x2={x1} y2={140} className="stroke-ink-700" strokeDasharray="3 3" />
                  <text x={x0} y={16} textAnchor="middle" className="fill-ink-300 text-[11px]">US IL {fmt(input.upstreamInvert, 2)}</text>
                  <text x={x1} y={16} textAnchor="middle" className="fill-ink-300 text-[11px]">DS IL {fmt(r.downstreamInvert, 2)}</text>
                  <text x={(x0 + x1) / 2} y={yEnd + 28} textAnchor="middle" className="fill-cyan-300 text-[11px]">
                    {input.length} m @ 1:{fmt(r.gradientX, 0)} → {fmt(r.fallMm, 0)} mm fall
                  </text>
                </>
              );
            })()}
          </svg>
        </Card>
      </div>
    </div>
  );
}
