import type { NextRequest } from "next/server";
import { fail, json } from "@/lib/broker/http";
import { BROKER_COOKIE, COOKIE_MAX_AGE, COOKIE_PATH, brokerConfigured, isEnv, sameOriginWrite, seal } from "@/lib/broker/session";
import { getInfo } from "@/lib/broker/t212";
import { clientKey, rateLimited } from "@/lib/ai/ratelimit";

export const dynamic = "force-dynamic";

// Connects a Trading 212 account: checks the key against the chosen server
// (practice or live), then stores it encrypted in an httpOnly cookie.
export async function POST(req: NextRequest) {
  if (!sameOriginWrite(req)) return json({ error: "Forbidden" }, 403);
  if (!brokerConfigured()) return json({ error: "Real trading isn't switched on for this server yet." }, 503);
  if (rateLimited(`broker-connect:${clientKey(req)}`, 10, 10 * 60_000)) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);
  let body: { env?: unknown; key?: unknown; secret?: unknown; acceptLive?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const env = body.env;
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const secret = typeof body.secret === "string" && body.secret.trim() ? body.secret.trim() : undefined;
  if (!isEnv(env)) return json({ error: "Choose practice or live." }, 400);
  if (key.length < 8 || key.length > 400 || /\s/.test(key)) return json({ error: "That doesn't look like a Trading 212 API key." }, 400);
  if (secret && (secret.length > 400 || /\s/.test(secret))) return json({ error: "That doesn't look like a Trading 212 API secret." }, 400);
  if (env === "live" && body.acceptLive !== true) return json({ error: "Please confirm you understand live orders use real money." }, 400);
  try {
    const info = await getInfo({ env, key, secret });
    const res = json({ connected: true, env, accountId: info.id, currency: info.currencyCode });
    res.cookies.set(BROKER_COOKIE, seal({ v: 1, env, key, secret, accountId: info.id, currency: info.currencyCode, at: Date.now() }), {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "strict",
      path: COOKIE_PATH,
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch (e) {
    return fail(e);
  }
}
