"use client";

import { useEffect, useRef, useState } from "react";

// Smoothly rolls a number to its new value (portfolio totals, balances), like
// the big banking apps. Jumps instantly when reduced motion is on.
export default function AnimatedNumber({ value, format, ms = 650 }: { value: number; format: (n: number) => string; ms?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || Math.abs(value - from.current) < 1e-9) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    cancelAnimationFrame(raf.current);
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const v = a + (value - a) * e;
      setShown(v);
      from.current = v;
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, ms]);

  return <>{format(shown)}</>;
}
