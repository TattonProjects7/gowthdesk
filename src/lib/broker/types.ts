// Shared types for real-money trading through a connected broker account.
// Shortlist is not a broker: orders go to the user's own Trading 212 account
// using an API key they create, and Trading 212 executes and holds the money.

export type BrokerEnv = "demo" | "live";
export type RealSide = "buy" | "sell";
export type RealOrderType = "market" | "limit" | "stop";

export interface BrokerStatus {
  broker: "trading212";
  /** The server has BROKER_SECRET set, so connections can be stored safely. */
  configured: boolean;
  connected: boolean;
  env?: BrokerEnv;
  accountId?: number;
  currency?: string;
}

export interface BrokerCash {
  free: number;
  total: number;
  invested: number;
  ppl: number;
  result: number;
  blocked: number | null;
  pieCash: number;
}

export interface BrokerPosition {
  ticker: string;
  /** Matching Shortlist instrument, when we list it. */
  symbol: string | null;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  fxPpl: number | null;
  maxSell: number | null;
  initialFillDate?: string;
}

export interface BrokerOrder {
  id: number;
  ticker: string;
  symbol: string | null;
  type: string;
  status: string;
  side: RealSide;
  quantity: number;
  filledQuantity: number;
  filledValue: number | null;
  value: number | null;
  limitPrice: number | null;
  stopPrice: number | null;
  creationTime?: string;
}

export interface BrokerAccount {
  env: BrokerEnv;
  currency: string;
  cash: BrokerCash;
  positions: BrokerPosition[];
  orders: BrokerOrder[];
  fetchedAt: number;
}

export interface PlaceRealOrder {
  symbol: string;
  side: RealSide;
  type: RealOrderType;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  timeValidity?: "DAY" | "GOOD_TILL_CANCEL";
}
