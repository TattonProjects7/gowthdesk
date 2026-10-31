"use client";

import { useEffect, useRef } from "react";
import { AD_CONFIG } from "@/lib/ads";
import { useAds } from "@/lib/useAds";
import { platformName } from "@/lib/platform";

// The apps' one ad: an AdMob anchored banner along the bottom of the screen,
// shown only on screens that carry ads. Before the first ad it runs Google's
// consent form (UMP) where the law requires one (UK and EU), then Apple's App
// Tracking Transparency prompt on iOS. The bottom tab bar lifts above the
// banner through the --ad-banner-h CSS variable.
let ready: Promise<boolean> | null = null;

async function initAdMob(): Promise<boolean> {
  const { AdMob, AdmobConsentStatus } = await import("@capacitor-community/admob");
  try {
    const info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) await AdMob.showConsentForm();
  } catch {
    /* consent service unreachable: Google serves non-personalised ads */
  }
  if (platformName() === "ios") {
    try {
      const t = await AdMob.trackingAuthorizationStatus();
      if (t.status === "notDetermined") await AdMob.requestTrackingAuthorization();
    } catch {
      /* older iOS: nothing to ask */
    }
  }
  await AdMob.initialize({});
  return true;
}

export default function NativeAdBanner() {
  const { allowed, native, bannerId } = useAds();
  const shown = useRef(false);
  const visible = useRef(false);

  useEffect(() => {
    if (!native || !bannerId) return;
    let cancelled = false;
    const setHeight = (h: number) => document.documentElement.style.setProperty("--ad-banner-h", `${Math.round(h)}px`);
    (async () => {
      try {
        if (!ready) ready = initAdMob().catch(() => false);
        if (!(await ready) || cancelled) return;
        const { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents } = await import("@capacitor-community/admob");
        if (allowed) {
          if (!shown.current) {
            shown.current = true;
            await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (s) => visible.current && setHeight(s.height));
            await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => setHeight(0));
            visible.current = true;
            await AdMob.showBanner({ adId: bannerId, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 0, isTesting: AD_CONFIG.admobTesting });
          } else if (!visible.current) {
            visible.current = true;
            await AdMob.resumeBanner();
          }
        } else if (visible.current) {
          visible.current = false;
          setHeight(0);
          await AdMob.hideBanner();
        }
      } catch {
        setHeight(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, native, bannerId]);

  return null;
}
