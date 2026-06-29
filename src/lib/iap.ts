"use client";

import { isNative, platformName } from "./platform";

// In-app purchases via RevenueCat. Apple and Google require IAP for digital
// subscriptions sold inside the apps, so on native we use this instead of
// Stripe (which stays for the web). All RevenueCat calls are dynamically
// imported and guarded, so this module is inert on the web.

const IOS_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
const ENTITLEMENT = "pro";

export function iapConfigured(): boolean {
  return isNative() && Boolean(platformName() === "ios" ? IOS_KEY : ANDROID_KEY);
}

let configured = false;

export async function initIap(): Promise<void> {
  if (!iapConfigured() || configured) return;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const apiKey = (platformName() === "ios" ? IOS_KEY : ANDROID_KEY) as string;
  await Purchases.configure({ apiKey });
  configured = true;
}

export async function isProNative(): Promise<boolean> {
  if (!iapConfigured()) return false;
  try {
    await initIap();
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const info = await Purchases.getCustomerInfo();
    return Boolean(info.customerInfo.entitlements.active[ENTITLEMENT]);
  } catch {
    return false;
  }
}

export async function purchasePro(): Promise<{ ok: boolean; message?: string }> {
  if (!isNative()) return { ok: false, message: "Not on a device" };
  if (!iapConfigured()) return { ok: false, message: "In-app purchases aren’t configured yet (set RevenueCat keys)." };
  try {
    await initIap();
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages?.[0];
    if (!pkg) return { ok: false, message: "No products available." };
    const res = await Purchases.purchasePackage({ aPackage: pkg });
    return { ok: Boolean(res.customerInfo.entitlements.active[ENTITLEMENT]) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Purchase failed";
    // RevenueCat throws a cancellation error the user triggered — treat softly.
    return { ok: false, message: /cancel/i.test(msg) ? "Purchase cancelled." : msg };
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!iapConfigured()) return false;
  try {
    await initIap();
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const info = await Purchases.restorePurchases();
    return Boolean(info.customerInfo.entitlements.active[ENTITLEMENT]);
  } catch {
    return false;
  }
}
