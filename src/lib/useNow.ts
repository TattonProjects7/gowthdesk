"use client";

import { useEffect, useState } from "react";

// A live clock that drives the simulated market. Returns `now` (epoch ms) that
// updates on an interval, plus `mounted` so price-dependent UI renders only on
// the client and never triggers a hydration mismatch.
export function useNow(intervalMs = 1500): { now: number; mounted: boolean } {
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    setMounted(true);
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { now, mounted };
}
