// Helpers shared by the /api/broker routes. Server-only.
import { NextResponse, type NextRequest } from "next/server";
import { BROKER_COOKIE, brokerConfigured, unseal, type BrokerSession } from "./session";
import { BrokerError } from "./t212";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(e: unknown): NextResponse {
  if (e instanceof BrokerError) return json({ error: e.message }, e.status);
  return json({ error: "Something went wrong talking to your broker." }, 500);
}

export function session(req: NextRequest): { s: BrokerSession } | { res: NextResponse } {
  if (!brokerConfigured()) return { res: json({ error: "Real trading isn't switched on for this server yet." }, 503) };
  const s = unseal(req.cookies.get(BROKER_COOKIE)?.value);
  if (!s) return { res: json({ error: "Connect your Trading 212 account first." }, 401) };
  return { s };
}
