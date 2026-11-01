"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { fmtGbp } from "@/lib/instruments";

// Small shared building blocks so the investing screens stay consistent.

export function Card({ children, className = "", tone = "default" }: { children: ReactNode; className?: string; tone?: "default" | "rose" | "emerald" | "violet" | "sky" | "amber" }) {
  const t =
    tone === "rose"
      ? "border-rose-400/20 bg-gradient-to-br from-rose-500/[0.12] to-ink-900/70"
      : tone === "emerald"
        ? "border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.12] to-ink-900/70"
        : tone === "violet"
          ? "border-blue-400/20 bg-gradient-to-br from-blue-500/[0.12] to-ink-900/70"
          : tone === "sky"
            ? "border-sky-400/20 bg-gradient-to-br from-sky-500/[0.12] to-ink-900/70"
            : tone === "amber"
              ? "border-amber-400/20 bg-gradient-to-br from-amber-500/[0.12] to-ink-900/70"
              : "border-white/[0.07] bg-ink-900/70";
  return <div className={`rounded-3xl border p-4 shadow-card sm:p-5 ${t} ${className}`}>{children}</div>;
}

export function H2({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-9 mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-400">{children}</h2>
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
    ink: "bg-white/[0.06] text-ink-300 ring-white/10",
    rose: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
    emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
    sky: "bg-sky-500/10 text-sky-300 ring-sky-400/20",
    violet: "bg-blue-500/10 text-blue-300 ring-blue-400/20",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${t[tone]}`}>{children}</span>;
}

export function Segmented<T extends string>({ options, value, onChange, size = "md" }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className={`inline-flex max-w-full overflow-x-auto no-scrollbar rounded-full border border-white/[0.08] bg-white/[0.03] p-1 ${size === "sm" ? "text-xs" : "text-sm"}`}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`whitespace-nowrap rounded-full px-3.5 ${size === "sm" ? "py-1" : "py-1.5"} font-semibold transition-all duration-200 ${
            o.id === value ? "bg-white text-ink-950 shadow-[0_6px_18px_-8px_rgba(255,255,255,0.5)]" : "text-ink-400 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, tone = "white" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: "white" | "rose" | "emerald" | "amber" | "sky" }) {
  const c = tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : tone === "sky" ? "text-sky-300" : "text-white";
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
      <p className="text-[11px] font-medium leading-tight text-ink-400">{label}</p>
      <p className={`mt-1 font-mono text-[15px] font-bold ${c}`}>{value}</p>
      {sub && <p className="text-[11px] text-ink-500">{sub}</p>}
    </div>
  );
}

export function Empty({ icon: Icon, title, body, cta }: { icon: React.ElementType; title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-white/10 bg-ink-900/60 p-8 text-center">
      <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] ring-1 ring-white/10">
        <Icon className="h-6 w-6 text-ink-300" />
      </div>
      <p className="relative font-semibold text-ink-100">{title}</p>
      <p className="relative mt-1 text-sm text-ink-400">{body}</p>
      {cta && (
        <Link href={cta.href} className="relative mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow-rose transition-transform active:scale-[0.98]">
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
      className={`w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white placeholder-ink-500 transition-colors focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white transition-colors focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${props.className ?? ""}`}
    />
  );
}

export function Button({ children, variant = "primary", className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "buy" | "sell" | "danger"; ref?: React.Ref<HTMLButtonElement> }) {
  const v: Record<string, string> = {
    primary: "bg-brand text-white shadow-glow-rose hover:brightness-110",
    buy: "bg-gradient-to-r from-emerald-400 to-teal-400 text-ink-950 shadow-glow-emerald hover:brightness-105",
    sell: "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-glow-rose hover:brightness-110",
    ghost: "border border-white/10 bg-white/[0.03] text-ink-100 hover:bg-white/[0.07]",
    danger: "border border-rose-400/30 bg-rose-500/[0.06] text-rose-300 hover:bg-rose-500/[0.12]",
  };
  return (
    <button {...rest} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${v[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, label, hint, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; icon?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5">{icon}</span>}
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">{label}</span>
          {hint && <span className="block text-xs text-ink-400">{hint}</span>}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-ink-700"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </label>
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
