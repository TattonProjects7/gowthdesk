"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import CoachSheet from "./CoachSheet";

// Lets any screen open the AI coach, optionally with a question ready to go
// ("Why is LLOY moving?", "Explain my health score").
interface CoachApi {
  open: (prompt?: string) => void;
  close: () => void;
  isOpen: boolean;
}

const Ctx = createContext<CoachApi>({ open: () => {}, close: () => {}, isOpen: false });

export function CoachProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const open = useCallback((p?: string) => {
    if (p) setPrompt(p);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Ctx.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && <CoachSheet onClose={close} pending={prompt} onConsumed={() => setPrompt(null)} />}
    </Ctx.Provider>
  );
}

export function useCoach(): CoachApi {
  return useContext(Ctx);
}
