"use client";

import { useMemo, useState } from "react";
import {
  calcSteel, SteelInput, SteelShape, DENSITIES, REBAR_SIZES,
} from "@/lib/sitecalc/steel";
import { Card, Field, Result, SelectField, fmt } from "@/components/sitecalc/ui";

export default function SteelPage() {
  const [input, setInput] = useState<SteelInput>({
    shape: "round",
    d1: 25,
    d2: 50,
    wall: 3,
    length: 6,
    quantity: 1,
    density: 7850,
    pricePerKg: 1.2,
  });

  const set = (k: keyof SteelInput) => (v: number) =>
    setInput((s) => ({ ...s, [k]: v }));

  const r = useMemo(() => calcSteel(input), [input]);
  const isRebar = input.shape === "rebar";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-4">
        <Card title="Section">
          <div className="space-y-3">
            <SelectField<SteelShape>
              label="Shape"
              value={input.shape}
              onChange={(v) => setInput((s) => ({ ...s, shape: v }))}
              options={[
                { value: "round", label: "Round bar" },
                { value: "square", label: "Square bar" },
                { value: "flat", label: "Flat bar" },
                { value: "plate", label: "Plate" },
                { value: "rhs", label: "RHS / SHS (hollow)" },
                { value: "chs", label: "CHS (round hollow)" },
                { value: "rebar", label: "Rebar" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              {isRebar ? (
                <SelectField<number>
                  label="Bar size"
                  value={input.d1}
                  onChange={(v) => set("d1")(v)}
                  options={REBAR_SIZES.map((d) => ({ value: d, label: `H${d} (${d}mm)` }))}
                />
              ) : (
                <Field
                  label={
                    input.shape === "round" || input.shape === "chs"
                      ? "Diameter"
                      : input.shape === "square"
                      ? "Side"
                      : "Width"
                  }
                  unit="mm"
                  value={input.d1}
                  onChange={set("d1")}
                  min={0}
                />
              )}
              {(input.shape === "flat" || input.shape === "plate" || input.shape === "rhs") && (
                <Field label={input.shape === "rhs" ? "Height" : "Thickness"} unit="mm" value={input.d2} onChange={set("d2")} min={0} />
              )}
              {(input.shape === "rhs" || input.shape === "chs") && (
                <Field label="Wall" unit="mm" value={input.wall} onChange={set("wall")} min={0} />
              )}
              <Field label="Length" unit="m" value={input.length} onChange={set("length")} min={0} />
              <Field label="Quantity" value={input.quantity} onChange={set("quantity")} min={0} step="1" />
            </div>
          </div>
        </Card>

        <Card title="Material & price">
          <div className="space-y-3">
            <SelectField<number>
              label="Material"
              value={input.density}
              onChange={(v) => set("density")(v)}
              options={DENSITIES.map((d) => ({ value: d.value, label: `${d.name} (${d.value} kg/m³)` }))}
            />
            <Field label="Price per kg" unit="£" value={input.pricePerKg} onChange={set("pricePerKg")} min={0} />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Result label="Cross-section area" value={fmt(r.areaMm2, 1)} unit="mm²" />
          <Result label="Weight per metre" value={fmt(r.massPerM, 3)} unit="kg/m" />
          <Result label="Total weight" value={fmt(r.totalMass, 2)} unit="kg" big accent="text-violet-400" />
          <Result label="Total cost" value={`£${fmt(r.totalCost, 2)}`} big accent="text-emerald-400" />
        </div>
        <Card>
          <p className="text-xs text-ink-500">
            Weight = density × cross-section × length × quantity. Rebar follows the
            standard d²/162 kg/m for steel. Hollow sections subtract the bore;
            radius corners are ignored, so figures are marginally conservative.
          </p>
        </Card>
      </div>
    </div>
  );
}
