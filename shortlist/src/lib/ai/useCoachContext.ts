"use client";

import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { getInstrument } from "../instruments";
import { getLesson } from "../learn/content";
import { levelFor } from "../learn/progress";
import { useLearn } from "../learn/store";
import { makePricer, usePortfolio } from "../portfolioStore";
import { summarise } from "../portfolio";
import { healthCheck } from "../health";
import { computeSignals } from "../signals";
import { useMarket } from "../useMarket";
import type { CoachContext } from "./types";

// Builds the context the coach sees: where you are in the app, your
// portfolio and health check, the instrument or lesson on screen, and your
// experience level. No name, email or account details are ever included.
export function useCoachContext(): { build: () => CoachContext; ready: boolean } {
  const path = usePathname() || "/";
  const { mounted, now, priceFor, closesFor } = useMarket();
  const portfolio = usePortfolio();
  const learnState = useLearn();

  const build = useCallback(() => {
    const p = makePricer(now || Date.now(), priceFor, closesFor);
    const ctx: CoachContext = {
      page: path,
      experience: learnState.profile.experience,
      lessonsDone: Object.keys(learnState.lessons).length,
      level: levelFor(learnState.xp).title,
    };

    const sum = summarise(portfolio, p);
    ctx.portfolio = {
      totalValue: sum.totalValue,
      cash: sum.cash,
      invested: sum.invested,
      dayChange: sum.dayChange,
      totalReturnPct: sum.totalReturnPct,
      accounts: portfolio.accounts.map((a) => a.type),
      holdings: sum.holdings.slice(0, 12).map((h) => ({
        symbol: h.symbol,
        name: h.instrument.name,
        type: h.instrument.type,
        account: portfolio.accounts.find((a) => a.id === h.accountId)?.type ?? "",
        valueGbp: h.valueGbp,
        weightPct: h.weightPct,
        pnlPct: h.pnlPct,
      })),
    };
    const h = healthCheck(portfolio, p, (s) => closesFor(s));
    ctx.health = {
      score: h.score,
      grade: h.grade,
      summary: h.summary,
      issues: [...h.factors]
        .sort((a, b) => a.points / a.max - b.points / b.max)
        .slice(0, 4)
        .map((f) => ({ label: f.label, detail: f.detail, tip: f.tip })),
    };

    const sym = path.match(/^\/(?:i|short)\/([A-Za-z]+)/)?.[1]?.toUpperCase();
    const inst = sym ? getInstrument(sym) : undefined;
    if (inst) {
      const closes = closesFor(inst.symbol);
      const sig = computeSignals(closes);
      const price = priceFor(inst.symbol);
      const prev = closes[closes.length - 2] || price;
      ctx.instrument = {
        symbol: inst.symbol,
        name: inst.name,
        type: inst.type,
        currency: inst.currency,
        price,
        dayChangePct: prev ? (price / prev - 1) * 100 : 0,
        trend30Pct: sig.trend30,
        rsi: sig.rsi,
        dailyVolPct: sig.volatility * 100,
        aboveTrend: !sig.belowShortMa,
        dividendYieldPct: inst.dividendYieldPct,
        ocfPct: inst.ocfPct,
        sector: inst.sector,
        industry: inst.industry,
        exchange: inst.exchange,
        region: inst.region,
        description: inst.description,
      };
    }

    const lessonId = path.match(/^\/learn\/([a-z0-9-]+)/)?.[1];
    const lesson = lessonId ? getLesson(lessonId) : undefined;
    if (lesson) ctx.lesson = { id: lesson.id, title: lesson.title };
    return ctx;
  }, [path, now, priceFor, closesFor, portfolio, learnState]);
  return { build, ready: mounted && now > 0 };
}
