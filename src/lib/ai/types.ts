// Shapes shared by the AI coach and digest, on both client and server.

export interface CoachHolding {
  symbol: string;
  name: string;
  type: string;
  account: string;
  valueGbp: number;
  weightPct: number;
  pnlPct: number;
}

export interface CoachInstrument {
  symbol: string;
  name: string;
  type: string;
  currency: string;
  price: number;
  dayChangePct: number;
  trend30Pct: number;
  rsi: number;
  dailyVolPct: number;
  aboveTrend: boolean;
  dividendYieldPct: number;
  ocfPct?: number;
  sector: string;
  region: string;
  description: string;
}

export interface CoachContext {
  page: string; // pathname
  experience: "beginner" | "intermediate" | "advanced" | null;
  lessonsDone: number;
  level: string;
  portfolio?: {
    totalValue: number;
    cash: number;
    invested: number;
    dayChange: number;
    totalReturnPct: number;
    accounts: string[];
    holdings: CoachHolding[];
  };
  health?: { score: number | null; grade: string; summary: string; issues: { label: string; detail: string; tip: string }[] };
  instrument?: CoachInstrument;
  lesson?: { id: string; title: string };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DigestInput {
  symbol: string;
  name: string;
  type: string;
  currency: string;
  price: number;
  dayChangePct: number;
  trend30Pct: number;
  rsi: number;
  zscore: number;
  dailyVolPct: number;
  aboveTrend: boolean;
  sentimentLongPct: number;
  catalyst?: string;
  headlines: string[];
}

export interface Digest {
  source: "ai" | "offline";
  headline: string;
  bullets: string[];
  takeaway: string;
}
