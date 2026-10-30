"use client";

import { ReactNode } from "react";

export function Field({
  label, value, onChange, unit, step = "any", min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: string;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-300">{label}</span>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-ink-700 bg-ink-900 focus-within:border-ink-500">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && (
          <span className="flex items-center border-l border-ink-700 px-3 text-xs text-ink-400">
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

export function SelectField<T extends string | number>({
  label, value, onChange, options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-300">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          onChange((match ? match.value : raw) as T);
        }}
        className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-ink-500"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Result({
  label, value, unit, big, accent,
}: {
  label: string;
  value: string;
  unit?: string;
  big?: boolean;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950/60 px-4 py-3">
      <p className="text-xs text-ink-400">{label}</p>
      <p className={`font-mono font-semibold ${big ? "text-2xl" : "text-lg"} ${accent ?? "text-white"}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-400">{unit}</span>}
      </p>
    </div>
  );
}

export function Card({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
      {title && <h3 className="mb-4 text-sm font-semibold text-ink-200">{title}</h3>}
      {children}
    </div>
  );
}

export function fmt(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return "–";
  return n.toLocaleString("en-GB", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}
