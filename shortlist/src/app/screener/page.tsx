import { Suspense } from "react";
import type { Metadata } from "next";
import Screener from "@/components/screener/Screener";

export const metadata: Metadata = {
  title: "Screener — Shortlist",
  description: "Filter UK and US shares, ETFs and crypto by valuation, quality, momentum and chart patterns.",
};

export default function ScreenerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Screener />
    </Suspense>
  );
}
