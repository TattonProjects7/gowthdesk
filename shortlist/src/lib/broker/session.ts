// Stores a connected broker key in an encrypted, httpOnly cookie scoped to the
// /api/broker routes. Browser JavaScript can't read it, it never touches
// localStorage, and the server needs BROKER_SECRET to decrypt it. Server-only.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { BrokerEnv } from "./types";
import type { T212Creds } from "./t212";

export const BROKER_COOKIE = "sl_broker";
export const COOKIE_PATH = "/api/broker";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export interface BrokerSession extends T212Creds {
  v: 1;
  accountId: number;
  currency: string;
  at: number;
}

export function brokerConfigured(): boolean {
  return (process.env.BROKER_SECRET ?? "").length >= 16;
}

function key(): Buffer {
  return createHash("sha256").update(process.env.BROKER_SECRET ?? "").digest();
}

export function seal(s: BrokerSession): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(s), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

export function unseal(token: string | undefined | null): BrokerSession | null {
  if (!token || !brokerConfigured()) return null;
  try {
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const d = createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    const json = Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
    const s = JSON.parse(json) as BrokerSession;
    if (s.v !== 1 || (s.env !== "demo" && s.env !== "live") || typeof s.key !== "string") return null;
    return s;
  } catch {
    return null;
  }
}

export function isEnv(v: unknown): v is BrokerEnv {
  return v === "demo" || v === "live";
}

/** Mutating requests must come from our own pages: same origin plus a custom header. */
export function sameOriginWrite(req: Request): boolean {
  if (req.headers.get("x-shortlist") !== "1") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches in some WebViews omit Origin
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
