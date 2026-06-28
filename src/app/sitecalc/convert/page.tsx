"use client";

import { useMemo, useState } from "react";
import {
  CATEGORIES, convert, convertTemp, TEMP_UNITS, TempUnit,
} from "@/lib/sitecalc/convert";
import { Card, Field, SelectField, fmt } from "@/components/sitecalc/ui";

export default function ConvertPage() {
  const [catName, setCatName] = useState(CATEGORIES[0].name);
  const isTemp = catName === "Temperature";
  const cat = CATEGORIES.find((c) => c.name === catName);

  const [value, setValue] = useState(1);
  const [fromI, setFromI] = useState(0);
  const [toI, setToI] = useState(1);

  const [tFrom, setTFrom] = useState<TempUnit>("°C");
  const [tTo, setTTo] = useState<TempUnit>("°F");

  const result = useMemo(() => {
    if (isTemp) return convertTemp(value, tFrom, tTo);
    if (!cat) return 0;
    return convert(value, cat.units[fromI], cat.units[toI]);
  }, [isTemp, cat, value, fromI, toI, tFrom, tTo]);

  const allCats = [...CATEGORIES.map((c) => c.name), "Temperature"];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card title="Category">
        <SelectField
          label="Quantity"
          value={catName}
          onChange={(v) => {
            setCatName(v);
            setFromI(0);
            setToI(1);
          }}
          options={allCats.map((c) => ({ value: c, label: c }))}
        />
      </Card>

      <Card>
        <div className="space-y-4">
          <Field label="Value" value={value} onChange={setValue} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {isTemp ? (
              <>
                <SelectField<TempUnit>
                  label="From"
                  value={tFrom}
                  onChange={setTFrom}
                  options={TEMP_UNITS.map((u) => ({ value: u, label: u }))}
                />
                <SelectField<TempUnit>
                  label="To"
                  value={tTo}
                  onChange={setTTo}
                  options={TEMP_UNITS.map((u) => ({ value: u, label: u }))}
                />
              </>
            ) : (
              cat && (
                <>
                  <SelectField<number>
                    label="From"
                    value={fromI}
                    onChange={setFromI}
                    options={cat.units.map((u, i) => ({ value: i, label: `${u.name} (${u.symbol})` }))}
                  />
                  <SelectField<number>
                    label="To"
                    value={toI}
                    onChange={setToI}
                    options={cat.units.map((u, i) => ({ value: i, label: `${u.name} (${u.symbol})` }))}
                  />
                </>
              )
            )}
          </div>

          <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-5 py-4 text-center">
            <p className="text-xs text-ink-400">Result</p>
            <p className="font-mono text-3xl font-bold text-emerald-300">
              {fmt(result, isTemp ? 2 : 5)}
            </p>
            <p className="mt-1 text-sm text-ink-400">
              {isTemp ? tTo : cat?.units[toI].symbol}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
