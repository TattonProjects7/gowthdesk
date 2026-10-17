import type { NextRequest } from "next/server";
import { fail, json, session } from "@/lib/broker/http";
import { getAccount } from "@/lib/broker/t212";

export const dynamic = "force-dynamic";

// Cash, open positions and working orders from the connected Trading 212 account.
export async function GET(req: NextRequest) {
  const r = session(req);
  if ("res" in r) return r.res;
  try {
    return json(await getAccount(r.s, r.s.currency));
  } catch (e) {
    return fail(e);
  }
}
