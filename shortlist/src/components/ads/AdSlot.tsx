"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AD_CONFIG } from "@/lib/ads";
import { useAds } from "@/lib/useAds";
import HousePromo from "./HousePromo";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptAdded = false;
function loadAdSense(client: string) {
  if (scriptAdded || typeof document === "undefined") return;
  scriptAdded = true;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(s);
}

/**
 * An ad space. On the web it holds a responsive AdSense unit (or a Shortlist
 * promo until AdSense is configured). In the apps the AdMob banner handles
 * advertising, so inline spaces only show promos when AdMob isn't set up.
 * Renders nothing for ad-free users, in real-money mode and on excluded screens.
 */
export default function AdSlot({ placement, kind = "banner", className = "" }: { placement: string; kind?: "banner" | "infeed"; className?: string }) {
  const { allowed, native, network, adFreeBilling } = useAds();
  if (!allowed) return null;
  if (native && network === "admob") return null;
  const slot = kind === "infeed" && AD_CONFIG.adsenseInFeedSlot ? AD_CONFIG.adsenseInFeedSlot : AD_CONFIG.adsenseSlot;
  return (
    <aside aria-label="Advertisement" data-ad-placement={placement} className={`my-5 ${className}`}>
      <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        <span>{network === "adsense" ? "Advertisement" : "From Shortlist"}</span>
        {adFreeBilling && (
          <Link href="/pricing#ad-free" className="normal-case tracking-normal text-violet-300 hover:underline">
            Remove ads
          </Link>
        )}
      </div>
      {network === "adsense" && !native ? <AdSense client={AD_CONFIG.adsenseClient} slot={slot} kind={kind} /> : <HousePromo seed={placement} adFreeBilling={adFreeBilling} compact={kind === "infeed"} />}
    </aside>
  );
}

function AdSense({ client, slot, kind }: { client: string; slot: string; kind: "banner" | "infeed" }) {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    loadAdSense(client);
    const el = ref.current;
    if (!el || el.dataset.pushed) return;
    el.dataset.pushed = "1";
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocked by an ad blocker: leave the space empty */
    }
  }, [client]);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.05] bg-ink-900/40" style={{ minHeight: kind === "infeed" ? 120 : 100 }}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
