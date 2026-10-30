"use client";

import { useMemo, useState } from "react";
import {
  calcConcrete, ConcreteInput, ConcreteShape, CONCRETE_MIXES,
} from "@/lib/sitecalc/concrete";
import { Card, Field, Result, SelectField, fmt } from "@/components/sitecalc/ui";

export default function ConcretePage() {
  const [input, setInput] = useState<ConcreteInput>({
    shape: "slab",
    length: 5,
    width: 4,
    thickness: 0.15,
    diameter: 0.3,
    height: 3,
    quantity: 1,
    wastePct: 10,
    pricePerM3: 130,
    cementRatio: 1,
    sandRatio: 2,
    aggRatio: 4,
  });

  const set = (k: keyof ConcreteInput) => (v: number) =>
    setInput((s) => ({ ...s, [k]: v }));

  const r = useMemo(() => calcConcrete(input), [input]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-4">
        <Card title="Element">
          <div className="space-y-3">
            <SelectField<ConcreteShape>
              label="Shape"
              value={input.shape}
              onChange={(v) => setInput((s) => ({ ...s, shape: v }))}
              options={[
                { value: "slab", label: "Slab / oversite" },
                { value: "footing", label: "Strip footing" },
                { value: "column-rect", label: "Rectangular column" },
                { value: "column-circ", label: "Circular column" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              {(input.shape === "slab" || input.shape === "footing") && (
                <>
                  <Field label="Length" unit="m" value={input.length} onChange={set("length")} min={0} />
                  <Field label="Width" unit="m" value={input.width} onChange={set("width")} min={0} />
                  <Field label={input.shape === "slab" ? "Thickness" : "Depth"} unit="m" value={input.thickness} onChange={set("thickness")} min={0} />
                </>
              )}
              {input.shape === "column-rect" && (
                <>
                  <Field label="Side a" unit="m" value={input.width} onChange={set("width")} min={0} />
                  <Field label="Side b" unit="m" value={input.thickness} onChange={set("thickness")} min={0} />
                  <Field label="Height" unit="m" value={input.height} onChange={set("height")} min={0} />
                </>
              )}
              {input.shape === "column-circ" && (
                <>
                  <Field label="Diameter" unit="m" value={input.diameter} onChange={set("diameter")} min={0} />
                  <Field label="Height" unit="m" value={input.height} onChange={set("height")} min={0} />
                </>
              )}
              <Field label="Quantity" value={input.quantity} onChange={set("quantity")} min={0} step="1" />
              <Field label="Waste" unit="%" value={input.wastePct} onChange={set("wastePct")} min={0} />
            </div>
          </div>
        </Card>

        <Card title="Mix & price">
          <div className="space-y-3">
            <SelectField
              label="Mix (cement:sand:agg)"
              value={`${input.cementRatio}:${input.sandRatio}:${input.aggRatio}`}
              onChange={(v) => {
                const mix = CONCRETE_MIXES.find(
                  (mx) => `${mx.c}:${mx.s}:${mx.a}` === v,
                );
                if (mix) setInput((s) => ({ ...s, cementRatio: mix.c, sandRatio: mix.s, aggRatio: mix.a }));
              }}
              options={CONCRETE_MIXES.map((mx) => ({
                value: `${mx.c}:${mx.s}:${mx.a}`,
                label: `${mx.name} — ${mx.label}`,
              }))}
            />
            <Field label="Ready-mix price" unit="£/m³" value={input.pricePerM3} onChange={set("pricePerM3")} min={0} />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Result label="Volume per element" value={fmt(r.unitVolume, 3)} unit="m³" />
          <Result label="Net volume" value={fmt(r.netVolume, 2)} unit="m³" />
          <Result label="Order (incl. waste)" value={fmt(r.grossVolume, 2)} unit="m³" big accent="text-sky-400" />
        </div>

        <Card title="If mixing on site">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Result label="Cement (25kg bags)" value={fmt(Math.ceil(r.cementBags), 0)} unit="bags" />
            <Result label="Sharp sand" value={fmt(r.sandTonnes, 2)} unit="t" />
            <Result label="Aggregate" value={fmt(r.aggTonnes, 2)} unit="t" />
          </div>
          <p className="mt-3 text-xs text-ink-500">
            Quantities from the selected mix ratio with a 1.54 dry-volume factor.
            For larger pours, ready-mix is usually more economical and consistent.
          </p>
        </Card>

        <Result label="Ready-mix cost (gross volume)" value={`£${fmt(r.totalCost, 0)}`} big accent="text-emerald-400" />
      </div>
    </div>
  );
}
