"use client";

import DealTicket from "@/components/DealTicket";
import RealDealTicket from "@/components/broker/RealDealTicket";
import { useMode } from "@/lib/broker/client";
import type { OrderSide, Pricer } from "@/lib/portfolio";

// Picks the right ticket for the current mode: the practice ticket in demo
// mode, the Trading 212 ticket in real mode.
export default function TradeTicket({ symbol, pricer, defaultSide = "buy", compact = false, priceLive }: { symbol: string; pricer: Pricer; defaultSide?: OrderSide; compact?: boolean; priceLive: boolean }) {
  const mode = useMode();
  if (mode === "real") return <RealDealTicket symbol={symbol} pricer={pricer} defaultSide={defaultSide} priceLive={priceLive} />;
  return <DealTicket symbol={symbol} pricer={pricer} defaultSide={defaultSide} compact={compact} />;
}
