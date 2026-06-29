"use client";

import { Capacitor } from "@capacitor/core";

// Tiny platform helpers. Safe to call on web/SSR (return web/false).
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function platformName(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
}
