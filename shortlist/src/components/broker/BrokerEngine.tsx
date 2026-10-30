"use client";

import { useEffect } from "react";
import { broker, getMode, setMode, useBroker, useMode } from "@/lib/broker/client";

// Checks the broker connection on load and keeps the real account fresh while
// real mode is on (every 15 seconds while the page is visible, which stays
// well inside Trading 212's rate limits).
export default function BrokerEngine() {
  const mode = useMode();
  const { status } = useBroker();

  useEffect(() => {
    broker.refreshStatus().then((s) => {
      if (getMode() === "real" && !s?.connected) setMode("demo");
    });
  }, []);

  useEffect(() => {
    if (mode !== "real" || !status?.connected) return;
    void broker.refreshAccount();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void broker.refreshAccount();
    }, 15_000);
    const onVis = () => {
      if (document.visibilityState === "visible") void broker.refreshAccount();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode, status?.connected]);

  return null;
}
