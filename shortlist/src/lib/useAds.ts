"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AD_CONFIG, adsAllowed, nativeBannerId, webNetwork, type AdNetwork } from "./ads";
import { useMode } from "./broker/client";
import { isNative, platformName } from "./platform";
import { useSubscription } from "./subscription";

/** Should this screen show ads, and from which network? */
export function useAds(): { allowed: boolean; native: boolean; network: AdNetwork; bannerId: string; adFreeBilling: boolean } {
  const path = usePathname() ?? "/";
  const mode = useMode();
  const { adFree, loading, adFreeBilling } = useSubscription();
  // Platform is only known in the browser; start as web and correct after mount.
  const [native, setNative] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");
  useEffect(() => {
    setNative(isNative());
    setPlatform(platformName());
  }, []);
  const allowed = adsAllowed({ path, native, adFree, mode, loading });
  const bannerId = nativeBannerId(platform, AD_CONFIG);
  return { allowed, native, network: native ? (bannerId ? "admob" : "house") : webNetwork(), bannerId, adFreeBilling };
}
