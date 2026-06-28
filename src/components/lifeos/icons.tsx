import {
  Gift, ShieldAlert, Calendar, CalendarClock, Receipt, Footprints,
  ArrowUpRight, ArrowDownLeft, TrendingDown, PiggyBank, RefreshCw,
  Sparkles, Bell, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Gift, ShieldAlert, Calendar, CalendarClock, Receipt, Footprints,
  ArrowUpRight, ArrowDownLeft, TrendingDown, PiggyBank, RefreshCw,
  Sparkles, Bell,
};

export function iconFor(name: string): LucideIcon {
  return MAP[name] ?? Bell;
}

export const TONE_TEXT: Record<string, string> = {
  neutral: "text-ink-200",
  warn: "text-amber-400",
  good: "text-emerald-400",
  money: "text-violet-300",
};

export const TONE_ICON: Record<string, string> = {
  neutral: "text-ink-400",
  warn: "text-amber-400",
  good: "text-emerald-400",
  money: "text-violet-400",
};
