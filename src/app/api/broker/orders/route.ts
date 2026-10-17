import type { NextRequest } from "next/server";
import { fail, json, session } from "@/lib/broker/http";
import { sameOriginWrite } from "@/lib/broker/session";
import { placeOrder } from "@/lib/broker/t212";
import { validateRealOrder } from "@/lib/broker/tickers";
import { clientKey, rateLimited } from "@/lib/ai/ratelimit";
import type { PlaceRealOrder } from "@/lib/broker/types";

export const dynamic = "force-dynamic";

// Places an order in the connected Trading 212 account. The page asks the user
// to confirm first; this route validates everything again before sending.
export async function POST(req: NextRequest) {
  if (!sameOriginWrite(req)) return json({ error: "Forbidden" }, 403);
  const r = session(req);
  if ("res" in r) return r.res;
  if (rateLimited(`broker-order:${r.s.env}:${r.s.accountId}:${clientKey(req)}`, 20, 60_000)) return json({ error: "Too many orders in a minute. Slow down a little." }, 429);
  let body: Partial<PlaceRealOrder>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const v = validateRealOrder(body);
  if (!v.ok) return json({ error: v.error }, 400);
  try {
    const order = await placeOrder(r.s, v.order);
    return json({ order, env: r.s.env });
  } catch (e) {
    return fail(e);
  }
}
