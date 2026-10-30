import type { NextRequest } from "next/server";
import { fail, json, session } from "@/lib/broker/http";
import { sameOriginWrite } from "@/lib/broker/session";
import { cancelOrder } from "@/lib/broker/t212";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOriginWrite(req)) return json({ error: "Forbidden" }, 403);
  const r = session(req);
  if ("res" in r) return r.res;
  const { id } = await params;
  const num = Number(id);
  if (!Number.isInteger(num) || num <= 0) return json({ error: "Bad order id" }, 400);
  try {
    await cancelOrder(r.s, num);
    return json({ cancelled: true });
  } catch (e) {
    return fail(e);
  }
}
