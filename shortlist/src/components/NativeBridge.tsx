"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isNative } from "@/lib/platform";
import { iapConfigured, initIap } from "@/lib/iap";
import { pushAlert } from "@/lib/alerts";
import { requestNotificationPermission } from "@/lib/native";

// Runs on the native iPhone / Android shell only. Opens straight into the app
// (not the marketing page), sets up the status bar / splash, wires the Android
// back button, asks for notification permission, registers for push, and
// initialises in-app purchases. A complete no-op on the web.
export default function NativeBridge() {
  const router = useRouter();
  const path = usePathname();

  // The app's home is the portfolio, never the web landing page.
  useEffect(() => {
    if (isNative() && path === "/") router.replace("/portfolio");
  }, [path, router]);

  useEffect(() => {
    if (!isNative()) return;
    const cleanups: (() => void)[] = [];

    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#050b1a" }).catch(() => {}); // Android only
      } catch {
        /* status bar not available */
      }
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* no splash */
      }

      // Android hardware back: go back in the app, or leave it from the home tab.
      try {
        const { App } = await import("@capacitor/app");
        const h = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack && window.location.pathname !== "/portfolio") window.history.back();
          else App.exitApp();
        });
        cleanups.push(() => h.remove());
      } catch {
        /* app plugin not available */
      }

      // Local notifications for alerts, fills, stops, plans and dividends.
      await requestNotificationPermission();

      // Remote push: request permission, register, and surface incoming pushes
      // in the in-app alert feed.
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === "granted") await PushNotifications.register();
        const h = await PushNotifications.addListener("pushNotificationReceived", (n) => {
          pushAlert({
            id: `push:${n.id || Date.now()}`,
            type: "agrade",
            symbol: (n.data?.symbol as string) || "",
            message: n.body || n.title || "New alert",
          });
        });
        cleanups.push(() => h.remove());
      } catch {
        /* push not available (e.g. no APNs/FCM config yet) */
      }

      // Tapping a notification opens the relevant instrument.
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const h = await LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
          const symbol = a.notification.extra?.symbol as string | undefined;
          router.push(symbol ? `/i/${symbol}` : "/portfolio");
        });
        cleanups.push(() => h.remove());
      } catch {
        /* local notifications not available */
      }

      // Initialise IAP so entitlement checks are ready.
      if (iapConfigured()) await initIap().catch(() => {});
    })();

    return () => cleanups.forEach((c) => c());
  }, [router]);

  return null;
}
