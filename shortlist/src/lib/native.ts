"use client";

import { isNative } from "./platform";

// Thin wrappers over the native capabilities the iPhone and Android apps add on
// top of the web build: haptics, OS notifications, and Face ID / Touch ID /
// fingerprint unlock. Every function is a safe no-op (or a web fallback) in the
// browser, and plugins are imported lazily so the web bundle stays light.

// --- Haptics ----------------------------------------------------------------

export function tapHaptic(): void {
  if (!isNative()) return;
  import("@capacitor/haptics").then(({ Haptics }) => Haptics.selectionChanged()).catch(() => {});
}

export function successHaptic(): void {
  if (!isNative()) return;
  import("@capacitor/haptics").then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success })).catch(() => {});
}

export function warningHaptic(): void {
  if (!isNative()) return;
  import("@capacitor/haptics").then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Warning })).catch(() => {});
}

export function impactHaptic(style: "light" | "medium" | "heavy" = "medium"): void {
  if (!isNative()) return;
  import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: style === "heavy" ? ImpactStyle.Heavy : style === "light" ? ImpactStyle.Light : ImpactStyle.Medium }))
    .catch(() => {});
}

// --- OS notifications -------------------------------------------------------
// In the apps, price alerts, order fills, stop-loss triggers, savings-plan runs
// and dividends become real iOS / Android notifications (local notifications,
// so they work with no push server). Remote push for when the app is closed is
// wired separately in NativeBridge.

let notifPermission: "unknown" | "granted" | "denied" = "unknown";
let nextId = Math.floor(Date.now() / 1000) % 1_000_000;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "default") return (await Notification.requestPermission()) === "granted";
    return Notification.permission === "granted";
  }
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const cur = await LocalNotifications.checkPermissions();
    const res = cur.display === "granted" ? cur : await LocalNotifications.requestPermissions();
    notifPermission = res.display === "granted" ? "granted" : "denied";
    return notifPermission === "granted";
  } catch {
    return false;
  }
}

export async function nativeNotify(title: string, body: string, extra?: Record<string, string>): Promise<void> {
  try {
    if (notifPermission === "unknown") await requestNotificationPermission();
    if (notifPermission !== "granted") return;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{ id: nextId++, title, body, extra, smallIcon: "ic_stat_icon", iconColor: "#ff3b3b" }],
    });
  } catch {
    /* notifications unavailable */
  }
}

// --- Daily reminders ----------------------------------------------------------

const SHORTLIST_REMINDER_ID = 730_001;

/**
 * A repeating local notification each morning that opens Today's Shortlist.
 * Native apps only (the web has no background notifications). Returns whether
 * the reminder is now on.
 */
export async function setShortlistReminder(on: boolean, hour = 7, minute = 30): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: SHORTLIST_REMINDER_ID }] }).catch(() => {});
    if (!on) return false;
    if (!(await requestNotificationPermission())) return false;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: SHORTLIST_REMINDER_ID,
          title: "Today's Shortlist is ready",
          body: "Ten shares that look weak today, each with the case for and against.",
          schedule: { on: { hour, minute }, allowWhileIdle: true },
          extra: { href: "/shortlist" },
          smallIcon: "ic_stat_icon",
          iconColor: "#ff3b3b",
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

// --- Biometric unlock -------------------------------------------------------

export interface NativeBiometricInfo {
  available: boolean;
  kind: "face" | "fingerprint" | "iris" | "device" | "none";
}

export async function nativeBiometricInfo(): Promise<NativeBiometricInfo> {
  if (!isNative()) return { available: false, kind: "none" };
  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    const r = await NativeBiometric.isAvailable({ useFallback: true });
    // BiometryType: 1 TOUCH_ID, 2 FACE_ID, 3 FINGERPRINT, 4 FACE_AUTHENTICATION, 5 IRIS_AUTHENTICATION, 6 MULTIPLE
    const t = Number(r.biometryType);
    const kind = t === 2 || t === 4 ? "face" : t === 1 || t === 3 ? "fingerprint" : t === 5 ? "iris" : r.isAvailable ? "device" : "none";
    return { available: Boolean(r.isAvailable), kind };
  } catch {
    return { available: false, kind: "none" };
  }
}

export async function nativeBiometricVerify(reason = "Unlock Shortlist"): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    await NativeBiometric.verifyIdentity({ reason, title: "Unlock Shortlist", subtitle: "Confirm it's you", negativeButtonText: "Cancel", useFallback: true });
    return true;
  } catch {
    return false;
  }
}
