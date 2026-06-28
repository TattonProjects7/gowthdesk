"use client";

import { useMemo, useState } from "react";
import { calcMasonry, MasonryInput, Unit } from "@/lib/sitecalc/masonry";
import { Card, Field, Result, SelectField, fmt } from "@/components/sitecalc/ui";

export default function MasonryPage() {
  const [input, setInput] = useState<MasonryInput>({
    wallLength: 8,
    wallHeight: 2.4,
    openings: 2,
    unit: "brick",
    skins: 1,
    wastePct: 5,
    pricePerUnit: 0.65,
  });

  const set = (k: keyof MasonryInput) => (v: number) =>
    setInput((s) => ({ ...s, [k]: v }));

  const r = useMemo(() => calcMasonry(input), [input]);
  const unitLabel = input.unit === "brick" ? "bricks" : "blocks";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-4">
        <Card title="Wall">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Length" unit="m" value={input.wallLength} onChange={set("wallLength")} min={0} />
            <Field label="Height" unit="m" value={input.wallHeight} onChange={set("wallHeight")} min={0} />
            <Field label="Openings" unit="m²" value={input.openings} onChange={set("openings")} min={0} />
            <Field label="Waste" unit="%" value={input.wastePct} onChange={set("wastePct")} min={0} />
          </div>
        </Card>

        <Card title="Material">
          <div className="space-y-3">
            <SelectField<Unit>
              label="Unit"
              value={input.unit}
              onChange={(v) => setInput((s) => ({ ...s, unit: v }))}
              options={[
                { value: "brick", label: "Brick (215×102.5×65) — 60/m²" },
                { value: "block", label: "Block (440×215×100) — 10/m²" },
              ]}
            />
            <SelectField<number>
              label="Wall build"
              value={input.skins}
              onChange={(v) => setInput((s) => ({ ...s, skins: v }))}
              options={[
                { value: 1, label: "Single skin / leaf" },
                { value: 2, label: "Cavity (two leaves)" },
              ]}
            />
            <Field label="Price per unit" unit="£" value={input.pricePerUnit} onChange={set("pricePerUnit")} min={0} />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Result label="Net wall area" value={fmt(r.netArea, 2)} unit="m²" />
          <Result label={`${input.unit === "brick" ? "Bricks" : "Blocks"} / m²`} value={fmt(r.unitsPerM2, 0)} />
          <Result label={`Total ${unitLabel}`} value={fmt(r.units, 0)} big accent="text-rose-400" />
        </div>

        <Card title="Mortar">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Result label="Mortar volume" value={fmt(r.mortarM3, 3)} unit="m³" />
            <Result label="Cement (25kg bags)" value={fmt(Math.ceil(r.cementBags), 0)} unit="bags" />
            <Result label="Building sand" value={fmt(r.sandTonnes, 2)} unit="t" />
          </div>
          <p className="mt-3 text-xs text-ink-500">Based on a 1:4 cement:sand mortar, including waste.</p>
        </Card>

        <Result label="Unit cost total" value={`£${fmt(r.totalCost, 2)}`} big accent="text-emerald-400" />
      </div>
    </div>
  );
}
