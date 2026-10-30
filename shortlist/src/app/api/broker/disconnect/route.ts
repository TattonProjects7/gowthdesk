import type { NextRequest } from "next/server";
import { json } from "@/lib/broker/http";
import { BROKER_COOKIE, COOKIE_PATH, sameOriginWrite } from "@/lib/broker/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOriginWrite(req)) return json({ error: "Forbidden" }, 403);
  const res = json({ connected: false });
  res.cookies.set(BROKER_COOKIE, "", { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "strict", path: COOKIE_PATH, maxAge: 0 });
  return res;
}
