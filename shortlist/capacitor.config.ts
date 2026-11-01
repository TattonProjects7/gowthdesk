import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "node:fs";

// Native iOS / Android shell for Shortlist. The apps load the deployed web
// build, so they reuse the full product — portfolio, markets, server routes,
// auth — and add native notifications, Face ID / fingerprint unlock, haptics,
// push and in-app purchases on top.
//
// The server address comes from NEXT_PUBLIC_APP_URL (environment, or
// .env.local — the Capacitor CLI doesn't load that file on its own, so we do).
// `mobile/www` is the small bundled fallback: `index.html` shows when no URL is
// configured, `offline.html` when the device can't reach the server.

function envFromFile(key: string): string | undefined {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n#]+)"?`, "m"));
    if (m) return m[1].trim();
  }
  return undefined;
}

const serverUrl = (process.env.NEXT_PUBLIC_APP_URL || envFromFile("NEXT_PUBLIC_APP_URL") || "").replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "uk.co.tattonprojects.shortlist",
  appName: "Shortlist",
  webDir: "mobile/www",
  backgroundColor: "#0d0f1a",
  server: serverUrl.startsWith("https://") ? { url: serverUrl, cleartext: false, errorPath: "offline.html" } : undefined,
  ios: {
    contentInset: "never",
    backgroundColor: "#0d0f1a",
  },
  android: {
    backgroundColor: "#0d0f1a",
  },
  plugins: {
    SplashScreen: { launchShowDuration: 600, backgroundColor: "#0d0f1a", showSpinner: false },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    LocalNotifications: { smallIcon: "ic_stat_icon", iconColor: "#e11d48" },
  },
};

export default config;
