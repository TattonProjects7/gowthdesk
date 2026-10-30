"use client";

import { useEffect, useState } from "react";

// A tiny event bus for celebrations — lesson finished, level up, badge,
// mission, free share. Celebrations are only ever for learning and good
// habits, never for placing trades (see progress.ts).

export interface Celebration {
  id: number;
  emoji: string;
  title: string;
  subtitle?: string;
  xp?: number;
  cash?: number;
  big?: boolean; // full confetti burst
}

type Listener = (c: Celebration) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function celebrate(c: Omit<Celebration, "id">): void {
  const item = { ...c, id: ++seq };
  listeners.forEach((l) => l(item));
}

export function useCelebrationQueue(): [Celebration | null, () => void] {
  const [queue, setQueue] = useState<Celebration[]>([]);
  useEffect(() => {
    const l: Listener = (c) => setQueue((q) => [...q, c]);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return [queue[0] ?? null, () => setQueue((q) => q.slice(1))];
}
