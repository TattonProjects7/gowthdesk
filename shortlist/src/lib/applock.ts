"use client";

import { createStore, useStore } from "./docstore";
import { isNative } from "./platform";
import { nativeBiometricInfo, nativeBiometricVerify } from "./native";

// App lock — Face ID / Touch ID on devices that support it (via the WebAuthn
// platform authenticator, which is what Safari/iOS WebView expose), with a PIN
// fallback. Both IG and interactive investor lead with biometric login; here it
// protects the app on launch and after it has been in the background.
//
// This is a device-level convenience lock, not a server-side credential: the
// data it guards is already the user's own (local or behind their Supabase
// session). It never leaves the device, so it is NOT synced to the cloud.

export interface AppLockSettings {
  enabled: boolean;
  method: "biometric" | "pin";
  pinHash: string | null;
  salt: string | null;
  credentialId: string | null; // base64url
  lockAfterSeconds: number; // re-lock after this long in the background
}

const DEFAULTS: AppLockSettings = { enabled: false, method: "pin", pinHash: null, salt: null, credentialId: null, lockAfterSeconds: 60 };

export const appLockStore = createStore<AppLockSettings>("shortlist.applock.local.v1", () => DEFAULTS);

export function useAppLock(): AppLockSettings {
  const v = useStore(appLockStore);
  return v && typeof v === "object" ? { ...DEFAULTS, ...v } : DEFAULTS;
}

// --- crypto helpers ---------------------------------------------------------

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return b64url(buf);
}

export function biometricsAvailable(): Promise<boolean> {
  // In the iPhone / Android apps: the OS biometric prompt (Face ID, Touch ID, fingerprint).
  if (typeof window !== "undefined" && isNative()) return nativeBiometricInfo().then((r) => r.available);
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return Promise.resolve(false);
    return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

// --- PIN --------------------------------------------------------------------

export async function enablePin(pin: string): Promise<boolean> {
  if (!/^\d{4,8}$/.test(pin)) return false;
  const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const pinHash = await sha256(salt + pin);
  appLockStore.set((p) => ({ ...p, enabled: true, method: "pin", pinHash, salt }));
  return true;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const s = appLockStore.get();
  if (!s.pinHash || !s.salt) return false;
  return (await sha256(s.salt + pin)) === s.pinHash;
}

// --- Biometric (WebAuthn platform authenticator) ----------------------------

export async function enableBiometric(): Promise<{ ok: boolean; message?: string }> {
  if (!(await biometricsAvailable())) return { ok: false, message: "Face ID / Touch ID isn’t available on this device or browser." };
  if (isNative()) {
    const ok = await nativeBiometricVerify("Turn on biometric unlock");
    if (!ok) return { ok: false, message: "Biometric check was cancelled." };
    appLockStore.set((p) => ({ ...p, enabled: true, method: "biometric", credentialId: "native" }));
    return { ok: true };
  }
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Shortlist" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "shortlist-user", displayName: "Shortlist" },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return { ok: false, message: "Setup was cancelled." };
    appLockStore.set((p) => ({ ...p, enabled: true, method: "biometric", credentialId: b64url(cred.rawId) }));
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not set up biometrics." };
  }
}

export async function verifyBiometric(): Promise<boolean> {
  const s = appLockStore.get();
  if (!s.credentialId) return false;
  if (s.credentialId === "native" || isNative()) return nativeBiometricVerify();
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: fromB64url(s.credentialId) as BufferSource, type: "public-key" }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}

export function disableAppLock(): void {
  appLockStore.set(() => DEFAULTS);
}

export function setLockAfter(seconds: number): void {
  appLockStore.set((p) => ({ ...p, lockAfterSeconds: Math.max(0, seconds) }));
}
