"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { fmtGbp } from "@/lib/instruments";

// Small shared building blocks so the investing screens stay consistent.

export function Card({ children, className = "", tone = "default" }: { children: ReactNode; className?: string; tone?: "default" | "rose" | "emerald" | "violet" | "sky" | "amber" }) {
  const t =
    tone === "rose"
      ? "border-rose-900 bg-rose-950/25"
      : tone === "emerald"
        ? "border-emerald-900 bg-emerald-950/25"
        : tone === "violet"
          ? "border-violet-900 bg-violet-950/20"
          : tone === "sky"
            ? "border-sky-900 bg-sky-950/25"
            : tone === "amber"
              ? "border-amber-900 bg-amber-950/25"
              : "border-ink-800 bg-ink-900";
  return <div className={`rounded-2xl border p-4 sm:p-5 ${t} ${className}`}>{children}</div>;
}

export function H2({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">{children}</h2>
      {right}
    </div>
  );
}

export function Money({ v, sign = false, className = "", dp }: { v: number; sign?: boolean; className?: string; dp?: number }) {
  const tone = sign ? (v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-ink-300") : "";
  return <span className={`font-mono ${tone} ${className}`}>{fmtGbp(v, { sign, dp })}</span>;
}

export function Pct({ v, className = "" }: { v: number; className?: string }) {
  const tone = v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-ink-400";
  return (
    <span className={`font-mono ${tone} ${className}`}>
      {v > 0 ? "+" : ""}
      {v.toFixed(2)}%
    </span>
  );
}

export function Pill({ children, tone = "ink" }: { children: ReactNode; tone?: "ink" | "rose" | "emerald" | "amber" | "sky" | "violet" }) {
  const t: Record<string, string> = {
    ink: "border-ink-700 bg-ink-800 text-ink-300",
    rose: "border-rose-900 bg-rose-950 text-rose-300",
    emerald: "border-emerald-900 bg-emerald-950 text-emerald-300",
    amber: "border-amber-900 bg-amber-950 text-amber-300",
    sky: "border-sky-900 bg-sky-950 text-sky-300",
    violet: "border-violet-900 bg-violet-950 text-violet-300",
  };
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${t[tone]}`}>{children}</span>;
}

export function Segmented<T extends string>({ options, value, onChange, size = "md" }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className={`inline-flex max-w-full overflow-x-auto no-scrollbar rounded-lg border border-ink-800 bg-ink-900 p-0.5 ${size === "sm" ? "text-xs" : "text-sm"}`}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`whitespace-nowrap rounded-md px-3 ${size === "sm" ? "py-1" : "py-1.5"} font-medium transition-colors ${
            o.id === value ? "bg-ink-700 text-white" : "text-ink-400 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, tone = "white" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "white" | "rose" | "emerald" | "amber" | "sky" }) {
  const c = tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : tone === "sky" ? "text-sky-300" : "text-white";
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-3">
      <p className="text-[11px] text-ink-500 leading-tight">{label}</p>
      <p className={`mt-1 font-mono font-bold ${c}`}>{value}</p>
      {sub && <p className="text-[11px] text-ink-500">{sub}</p>}
    </div>
  );
}

export function Empty({ icon: Icon, title, body, cta }: { icon: React.ElementType; title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900 p-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-ink-500 mb-3" />
      <p className="text-ink-200 font-medium">{title}</p>
      <p className="text-ink-500 text-sm mt-1">{body}</p>
      {cta && (
        <Link href={cta.href} className="mt-4 inline-flex rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder-ink-500 focus:border-rose-600 focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-white focus:border-rose-600 focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function Button({ children, variant = "primary", className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "buy" | "sell" | "danger" }) {
  const v: Record<string, string> = {
    primary: "bg-rose-600 text-white hover:bg-rose-500",
    buy: "bg-emerald-600 text-white hover:bg-emerald-500",
    sell: "bg-rose-600 text-white hover:bg-rose-500",
    ghost: "border border-ink-700 text-ink-200 hover:bg-ink-800",
    danger: "border border-rose-900 text-rose-300 hover:bg-rose-950",
  };
  return (
    <button {...rest} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtDay(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
