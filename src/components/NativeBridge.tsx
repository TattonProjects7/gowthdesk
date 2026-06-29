"use client";

import { useEffect } from "react";
import { isNative } from "@/lib/platform";
import { iapConfigured, initIap } from "@/lib/iap";
import { pushAlert } from "@/lib/alerts";

// Runs once on the native shell only. Sets up the status bar / splash, registers
// for push notifications, and initialises in-app purchases. A complete no-op on
// the web, so it never affects the browser experience.
export default function NativeBridge() {
  useEffect(() => {
    if (!isNative()) return;

    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        /* status bar not available */
      }
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* no splash */
      }

      // Push notifications: request permission, register, and surface incoming
      // pushes in the in-app alert feed.
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === "granted") await PushNotifications.register();
        PushNotifications.addListener("pushNotificationReceived", (n) => {
          pushAlert({
            id: `push:${n.id || Date.now()}`,
            type: "agrade",
            symbol: (n.data?.symbol as string) || "",
            message: n.body || n.title || "New alert",
          });
        });
      } catch {
        /* push not available */
      }

      // Initialise IAP so entitlement checks are ready.
      if (iapConfigured()) await initIap().catch(() => {});
    })();
  }, []);

  return null;
}
