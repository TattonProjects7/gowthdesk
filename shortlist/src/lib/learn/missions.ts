// Missions — small real-world challenges that turn a lesson into a habit.
// Each one is checked against the actual app state (portfolio, watchlists,
// alerts, flags), so you complete it by doing, not by tapping "done".

import type { PortfolioState } from "../portfolio";
import type { LearnState } from "./progress";

export interface MissionSnapshot {
  portfolio: PortfolioState;
  priceAlerts: number;
  trackedShorts: number;
  learn: LearnState;
}

export interface Mission {
  id: string;
  emoji: string;
  title: string;
  detail: string;
  xp: number;
  reward: number; // practice £
  href: string;
  lesson?: string;
  done: (s: MissionSnapshot) => boolean;
}

const manualBuys = (p: PortfolioState) => p.orders.filter((o) => o.status === "filled" && o.side === "buy" && o.source === "manual");

export const MISSIONS: Mission[] = [
  {
    id: "first-buy",
    emoji: "🛒",
    title: "Make your first investment",
    detail: "Buy any share, ETF or coin — even £1 counts.",
    xp: 50,
    reward: 10,
    href: "/markets",
    lesson: "what-is-a-share",
    done: (s) => manualBuys(s.portfolio).length > 0,
  },
  {
    id: "global-core",
    emoji: "🌍",
    title: "Own the world",
    detail: "Hold a global or S&P 500 tracker (VWRL or VUSA) as a core holding.",
    xp: 60,
    reward: 15,
    href: "/i/VWRL",
    lesson: "what-is-an-etf",
    done: (s) => s.portfolio.holdings.some((h) => h.symbol === "VWRL" || h.symbol === "VUSA"),
  },
  {
    id: "diversify",
    emoji: "🥚",
    title: "Spread your eggs",
    detail: "Hold 5 or more different investments.",
    xp: 70,
    reward: 15,
    href: "/markets",
    lesson: "risk-and-return",
    done: (s) => new Set(s.portfolio.holdings.map((h) => h.symbol)).size >= 5,
  },
  {
    id: "limit-order",
    emoji: "🎯",
    title: "Name your price",
    detail: "Place a limit order instead of buying at market.",
    xp: 50,
    reward: 10,
    href: "/i/VWRL",
    lesson: "order-types",
    done: (s) => s.portfolio.orders.some((o) => o.type === "limit"),
  },
  {
    id: "protect",
    emoji: "🛡️",
    title: "Set a safety net",
    detail: "Add a stop-loss or trailing stop to a holding.",
    xp: 60,
    reward: 15,
    href: "/portfolio?tab=holdings",
    lesson: "position-sizing",
    done: (s) => s.portfolio.holdings.some((h) => h.stopLoss != null || h.trailingPct != null),
  },
  {
    id: "isa",
    emoji: "🇬🇧",
    title: "Use your tax shield",
    detail: "Open a practice ISA and invest inside it.",
    xp: 70,
    reward: 20,
    href: "/portfolio?tab=accounts",
    lesson: "isas",
    done: (s) => {
      const isa = s.portfolio.accounts.find((a) => a.type === "ISA");
      return Boolean(isa && s.portfolio.holdings.some((h) => h.accountId === isa.id));
    },
  },
  {
    id: "savings-plan",
    emoji: "🔁",
    title: "Put it on autopilot",
    detail: "Start a weekly, fortnightly or monthly savings plan.",
    xp: 70,
    reward: 20,
    href: "/portfolio?tab=automate",
    lesson: "compounding",
    done: (s) => s.portfolio.savingsPlans.length > 0,
  },
  {
    id: "price-alert",
    emoji: "🔔",
    title: "Never miss a move",
    detail: "Set a price alert on anything you're watching.",
    xp: 40,
    reward: 5,
    href: "/watchlist",
    done: (s) => s.priceAlerts > 0,
  },
  {
    id: "look-through",
    emoji: "🔬",
    title: "Look under the bonnet",
    detail: "Open the Underlying view in Analytics to see what your funds hold.",
    xp: 40,
    reward: 5,
    href: "/portfolio?tab=analytics",
    lesson: "look-through",
    done: (s) => Boolean(s.learn.flags.lookthrough),
  },
  {
    id: "rebalance",
    emoji: "⚖️",
    title: "Back in balance",
    detail: "Set target weights and rebalance to them.",
    xp: 80,
    reward: 20,
    href: "/portfolio?tab=automate",
    lesson: "look-through",
    done: (s) => s.portfolio.orders.some((o) => o.source === "rebalance" && o.status === "filled"),
  },
  {
    id: "ask-coach",
    emoji: "🤖",
    title: "Ask the coach",
    detail: "Ask the AI coach anything about investing or your portfolio.",
    xp: 30,
    reward: 5,
    href: "/learn",
    done: (s) => Boolean(s.learn.flags.coach),
  },
  {
    id: "track-short",
    emoji: "📉",
    title: "Try the other side",
    detail: "Track a defined-risk short from the scanner.",
    xp: 60,
    reward: 10,
    href: "/scan",
    lesson: "short-selling",
    done: (s) => s.trackedShorts > 0,
  },
];

/** Missions that are satisfied by the snapshot but not yet recorded as complete. */
export function newlyCompleted(snap: MissionSnapshot): Mission[] {
  return MISSIONS.filter((m) => !snap.learn.missions[m.id] && m.done(snap));
}
