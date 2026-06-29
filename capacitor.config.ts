import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS/Android shell for Shortlist. The app loads the deployed web build
// (set NEXT_PUBLIC_APP_URL to your https URL before `npx cap sync`), so the
// native apps reuse the full product including server routes and auth.
const serverUrl = process.env.NEXT_PUBLIC_APP_URL;

const config: CapacitorConfig = {
  appId: "com.shortlist.app",
  appName: "Shortlist",
  webDir: "public",
  backgroundColor: "#0d0f1a",
  server:
    serverUrl && serverUrl.startsWith("https")
      ? { url: serverUrl, cleartext: false }
      : undefined,
  plugins: {
    SplashScreen: { launchShowDuration: 600, backgroundColor: "#0d0f1a", showSpinner: false },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
