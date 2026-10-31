import type { NextRequest } from "next/server";
import { json } from "@/lib/broker/http";
import { BROKER_COOKIE, brokerConfigured, unseal } from "@/lib/broker/session";
import type { BrokerStatus } from "@/lib/broker/types";

export const dynamic = "force-dynamic";

// Whether real trading is available on this server and whether this browser
// has a broker connected. Never returns the key itself.
export async function GET(req: NextRequest) {
  const configured = brokerConfigured();
  const s = configured ? unseal(req.cookies.get(BROKER_COOKIE)?.value) : null;
  const body: BrokerStatus = { broker: "trading212", configured, connected: Boolean(s), env: s?.env, accountId: s?.accountId, currency: s?.currency };
  return json(body);
}
