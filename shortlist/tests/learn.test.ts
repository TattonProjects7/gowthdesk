import { describe, it, expect } from "vitest";
import { LESSONS, TRACKS, GLOSSARY, findTerm, getTerm, lessonsFor } from "@/lib/learn/content";
import {
  initialLearn,
  levelFor,
  bumpStreak,
  liveStreak,
  completeLesson,
  answerDaily,
  dailyQuestion,
  completeMissions,
  claimFreeShare,
  pickFreeShare,
  suggestedLesson,
  syncBadges,
  FREE_SHARE_POOL,
  LEVELS,
} from "@/lib/learn/progress";
import { MISSIONS, newlyCompleted } from "@/lib/learn/missions";
import { initialState, placeOrder, openAccount, setProtection, addSavingsPlan, type Pricer } from "@/lib/portfolio";
import { getInstrument } from "@/lib/instruments";

const DAY = 86400_000;
const T = Date.UTC(2026, 9, 17, 9);

describe("lesson content", () => {
  it("every lesson has cards, a valid quiz and belongs to a track", () => {
    const ids = new Set<string>();
    for (const l of LESSONS) {
      expect(ids.has(l.id)).toBe(false);
      ids.add(l.id);
      expect(TRACKS.some((t) => t.id === l.track)).toBe(true);
      expect(l.cards.length).toBeGreaterThanOrEqual(3);
      expect(l.quiz.length).toBe(3);
      for (const q of l.quiz) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(q.why.length).toBeGreaterThan(10);
      }
      for (const c of l.cards) {
        if (c.widget === "chart") expect(getInstrument(c.symbol ?? "")).toBeTruthy();
        if (c.tryIt) expect(c.tryIt.href.startsWith("/")).toBe(true);
      }
    }
    for (const t of TRACKS) expect(lessonsFor(t.id).length).toBeGreaterThanOrEqual(3);
  });

  it("glossary terms link to real lessons and are findable in sentences", () => {
    for (const t of GLOSSARY) if (t.lesson) expect(LESSONS.some((l) => l.id === t.lesson)).toBe(true);
    expect(findTerm("what is an ETF?")?.term).toBe("ETF");
    expect(findTerm("explain the RSI to me")?.term).toBe("RSI");
    expect(findTerm("how does a stocks and shares isa work")?.term).toBe("ISA");
    expect(getTerm("Drawdown")?.lesson).toBe("risk-and-return");
    expect(findTerm("zzz qqq")).toBeUndefined();
  });
});

describe("levels and streaks", () => {
  it("maps XP to levels with progress", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, title: "Curious", pct: 0 });
    expect(levelFor(150).level).toBe(2);
    expect(levelFor(275)).toMatchObject({ level: 2, pct: 50 });
    const top = levelFor(LEVELS[LEVELS.length - 1].at + 500);
    expect(top.next).toBeNull();
    expect(top.pct).toBe(100);
  });

  it("extends a streak on consecutive days, resets after a gap, and ignores same-day repeats", () => {
    let s = initialLearn().streak;
    s = bumpStreak(s, T);
    expect(s.count).toBe(1);
    expect(bumpStreak(s, T + 3600_000)).toBe(s);
    s = bumpStreak(s, T + DAY);
    s = bumpStreak(s, T + 2 * DAY);
    expect(s).toMatchObject({ count: 3, best: 3 });
    expect(liveStreak(s, T + 3 * DAY)).toBe(3); // still alive until a full day is missed
    expect(liveStreak(s, T + 4 * DAY)).toBe(0);
    s = bumpStreak(s, T + 5 * DAY);
    expect(s).toMatchObject({ count: 1, best: 3 });
  });
});

describe("lessons, daily question and badges", () => {
  const lesson = LESSONS[0];

  it("pays XP (+50% for perfect) and practice cash once", () => {
    const a = completeLesson(initialLearn(), lesson.id, 3, 3, T);
    expect(a.firstTime).toBe(true);
    expect(a.xp).toBe(lesson.xp + Math.round(lesson.xp * 0.5));
    expect(a.cash).toBe(lesson.reward);
    expect(a.state.earned).toBe(lesson.reward);
    expect(a.badges.map((b) => b.id).sort()).toEqual(["first-lesson", "perfect"]);
    const again = completeLesson(a.state, lesson.id, 3, 3, T + 1000);
    expect(again.xp).toBe(0);
    expect(again.cash).toBe(0);
  });

  it("awards the perfect bonus on a later perfect retake", () => {
    const first = completeLesson(initialLearn(), lesson.id, 1, 3, T);
    expect(first.xp).toBe(lesson.xp);
    const retake = completeLesson(first.state, lesson.id, 3, 3, T + 1000);
    expect(retake.xp).toBe(Math.round(lesson.xp * 0.5));
    expect(retake.cash).toBe(0);
    expect(completeLesson(retake.state, lesson.id, 3, 3, T + 2000).xp).toBe(0);
  });

  it("reports a level-up when XP crosses a threshold", () => {
    let s = initialLearn();
    let levelled = null;
    for (const l of LESSONS.slice(0, 3)) {
      const a = completeLesson(s, l.id, 3, 3, T);
      s = a.state;
      levelled = levelled ?? a.leveledUp;
    }
    expect(levelled?.level).toBe(2);
  });

  it("answers the daily question once per day and keeps the streak", () => {
    const q = dailyQuestion(T);
    expect(q.options[q.answer]).toBeTruthy();
    const a = answerDaily(initialLearn(), true, T);
    expect(a.xp).toBe(25);
    expect(a.state.streak.count).toBe(1);
    expect(answerDaily(a.state, true, T + 60_000).xp).toBe(0);
    expect(answerDaily(a.state, false, T + DAY).state.streak.count).toBe(2);
    expect(dailyQuestion(T + DAY).q).not.toBe(q.q);
  });

  it("unlocks track badges when every lesson in a track is done", () => {
    let s = initialLearn();
    for (const l of lessonsFor("uk")) s = completeLesson(s, l.id, 2, 3, T).state;
    expect(s.badges["track-uk"]).toBeTruthy();
    expect(syncBadges(s, T).unlocked).toHaveLength(0);
  });

  it("suggests the next unfinished lesson, starting from the learner's track", () => {
    const s = completeLesson(initialLearn(), "moving-averages", 3, 3, T).state;
    expect(suggestedLesson(s, "charts")?.id).toBe("rsi-momentum");
    expect(suggestedLesson(initialLearn())?.id).toBe("what-is-a-share");
  });
});

describe("free share", () => {
  it("picks from the weighted pool and only once", () => {
    expect(pickFreeShare(0)).toBe(FREE_SHARE_POOL[0].symbol);
    expect(pickFreeShare(0.9999)).toBe(FREE_SHARE_POOL[FREE_SHARE_POOL.length - 1].symbol);
    for (const x of FREE_SHARE_POOL) expect(getInstrument(x.symbol)).toBeTruthy();
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const sym = pickFreeShare(i / 1000);
      counts[sym] = (counts[sym] ?? 0) + 1;
    }
    expect(counts.LLOY).toBeGreaterThan(counts.AAPL);
    const c = claimFreeShare(initialLearn(), "LLOY", T);
    expect(c.state.freeShare).toMatchObject({ claimed: true, symbol: "LLOY" });
    expect(c.badges.map((b) => b.id)).toContain("free-share");
    expect(claimFreeShare(c.state, "AAPL", T).state.freeShare.symbol).toBe("LLOY");
  });
});

describe("missions", () => {
  const P: Pricer = { now: T, price: (s) => ({ VWRL: 100, LLOY: 60, AAPL: 200, BTC: 60000, ISF: 8, AGBP: 5 })[s] ?? 0, prevClose: (s) => ({ VWRL: 99 })[s] ?? 0 };

  it("completes only when the real condition is met", () => {
    let portfolio = initialState(T);
    const learn = initialLearn();
    const snap = () => ({ portfolio, priceAlerts: 0, trackedShorts: 0, learn });
    expect(newlyCompleted(snap())).toHaveLength(0);

    portfolio = placeOrder(portfolio, { accountId: "acc_gia", symbol: "VWRL", side: "buy", type: "market", amountGbp: 500 }, P).state;
    expect(newlyCompleted(snap()).map((m) => m.id).sort()).toEqual(["first-buy", "global-core"]);

    for (const sym of ["LLOY", "AAPL", "BTC", "ISF"]) portfolio = placeOrder(portfolio, { accountId: "acc_gia", symbol: sym, side: "buy", type: "market", amountGbp: 100 }, P).state;
    portfolio = setProtection(portfolio, portfolio.holdings[0].id, { trailingPct: 10 });
    portfolio = openAccount(portfolio, "ISA", T).state;
    expect(newlyCompleted(snap()).map((m) => m.id)).not.toContain("isa"); // opened but empty
    portfolio = { ...portfolio, accounts: portfolio.accounts.map((a) => (a.type === "ISA" ? { ...a, cash: 1000 } : a)) };
    portfolio = placeOrder(portfolio, { accountId: "acc_isa", symbol: "AGBP", side: "buy", type: "market", amountGbp: 200 }, P).state;
    portfolio = addSavingsPlan(portfolio, { accountId: "acc_gia", amount: 50, frequency: "monthly", target: { kind: "portfolio" }, nextRunAt: T + DAY }, T);
    const ids = newlyCompleted({ portfolio, priceAlerts: 1, trackedShorts: 1, learn: { ...learn, flags: { coach: T, lookthrough: T } } }).map((m) => m.id);
    for (const id of ["diversify", "protect", "isa", "savings-plan", "price-alert", "track-short", "ask-coach", "look-through"]) expect(ids).toContain(id);
    expect(ids).not.toContain("rebalance");
    expect(ids).not.toContain("limit-order");
  });

  it("pays each mission once and unlocks mission badges", () => {
    const five = MISSIONS.slice(0, 5).map((m) => ({ id: m.id, xp: m.xp, reward: m.reward }));
    const a = completeMissions(initialLearn(), five, T);
    expect(a.xp).toBe(five.reduce((x, m) => x + m.xp, 0));
    expect(a.cash).toBe(five.reduce((x, m) => x + m.reward, 0));
    expect(a.badges.map((b) => b.id)).toEqual(expect.arrayContaining(["first-mission", "five-missions"]));
    expect(completeMissions(a.state, five, T).xp).toBe(0);
  });
});
