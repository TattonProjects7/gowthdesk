"use client";

import Link from "next/link";
import { Bell, GraduationCap, LayoutGrid, ShieldOff, Sparkles } from "lucide-react";
import { AD_FREE_PRICE } from "@/lib/ads";

// Shortlist's own promotions, shown in ad spaces until an ad network is
// approved (and in the apps when AdMob isn't set up).
const PROMOS = [
  { id: "screen-alerts", icon: Bell, title: "Get told when a share fits your rules", body: "Save any screen and Shortlist alerts you the moment a new share enters it.", href: "/screener", cta: "Open the screener" },
  { id: "academy", icon: GraduationCap, title: "Learn investing in 3-minute lessons", body: "Bite-size lessons that pay practice cash, from what a share is to reading a chart.", href: "/learn", cta: "Start learning" },
  { id: "portfolio-map", icon: LayoutGrid, title: "See your portfolio as a heatmap", body: "Every holding sized by what you own and coloured by how it's doing.", href: "/maps", cta: "Open the heatmap" },
  { id: "ai-screens", icon: Sparkles, title: "Describe the shares you want", body: "Type “cheap UK dividend payers” and the screener builds the filters for you.", href: "/screener", cta: "Try it" },
];

const AD_FREE = { id: "ad-free", icon: ShieldOff, title: `Go ad-free for ${AD_FREE_PRICE} a month`, body: "No adverts on the web or in the apps, on every device you sign in to. Cancel any time.", href: "/pricing#ad-free", cta: "See the plan" };

function pick(seed: string, withAdFree: boolean) {
  const list = withAdFree ? [AD_FREE, ...PROMOS] : PROMOS;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const day = Math.floor(Date.now() / 86400_000);
  return list[Math.abs(h + day) % list.length];
}

export default function HousePromo({ seed, adFreeBilling, compact = false }: { seed: string; adFreeBilling: boolean; compact?: boolean }) {
  const p = pick(seed, adFreeBilling);
  const Icon = p.icon;
  return (
    <Link href={p.href} className={`flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-gradient-to-r from-blue-500/[0.08] via-ink-900/70 to-sky-500/[0.06] ${compact ? "p-3" : "p-4"} hover:border-white/15`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-blue-200">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{p.title}</span>
        {!compact && <span className="block text-xs text-ink-400">{p.body}</span>}
      </span>
      <span className="hidden shrink-0 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white sm:inline">{p.cta}</span>
    </Link>
  );
}
