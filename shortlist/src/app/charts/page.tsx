import { Suspense } from "react";
import type { Metadata } from "next";
import ChartsPage from "@/components/charts/ChartsPage";

export const metadata: Metadata = {
  title: "Charts — Shortlist",
  description: "Up to four candlestick charts side by side, with moving averages, volume and auto-drawn trendlines.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ChartsPage />
    </Suspense>
  );
}
