"use client";

import { createStore, useStore } from "../docstore";
import { celebrate } from "../celebrate";
import { successHaptic } from "../native";
import { portfolioStore } from "../portfolioStore";
import { creditReward, ensureState, grantShares, type Pricer } from "../portfolio";
import { getInstrument } from "../instruments";
import { getLesson } from "./content";
import type { Mission } from "./missions";
import * as L from "./progress";

// The learner's progress document (synced across devices like the portfolio)
// and the actions the UI calls. Rewards are paid into the practice general
// account, and every milestone fires a celebration.

export const learnStore = createStore<L.LearnState>("shortlist.learn.v1", L.initialLearn);

export function useLearn(): L.LearnState {
  return L.ensureLearn(useStore(learnStore));
}

function payCash(amount: number, note: string) {
  if (!(amount > 0)) return;
  portfolioStore.set((prev) => {
    const s = ensureState(prev);
    const gia = s.accounts.find((a) => a.type === "GIA") ?? s.accounts[0];
    return gia ? creditReward(s, gia.id, amount, Date.now(), note) : s;
  });
}

function announce(a: L.Award) {
  if (a.leveledUp) celebrate({ emoji: "🚀", title: `Level ${a.leveledUp.level}: ${a.leveledUp.title}`, subtitle: "You levelled up!", big: true });
  for (const b of a.badges) celebrate({ emoji: b.emoji, title: `Badge unlocked: ${b.title}`, subtitle: b.how });
}

function update(fn: (s: L.LearnState) => L.Award): L.Award {
  let out!: L.Award;
  learnStore.set((prev) => {
    out = fn(L.ensureLearn(prev));
    return out.state;
  });
  return out;
}

export const learn = {
  finishLesson(lessonId: string, score: number, total: number): L.Award {
    const a = update((s) => L.completeLesson(s, lessonId, score, total, Date.now()));
    const lesson = getLesson(lessonId);
    if (a.cash) payCash(a.cash, `Learn & Earn: “${lesson?.title ?? lessonId}”`);
    if (a.xp || a.cash) {
      successHaptic();
      celebrate({
        emoji: a.perfect ? "💯" : "🎓",
        title: a.firstTime ? "Lesson complete!" : a.perfect ? "Perfect retake!" : "Lesson reviewed",
        subtitle: lesson?.title,
        xp: a.xp,
        cash: a.cash,
        big: a.firstTime,
      });
    }
    announce(a);
    return a;
  },

  answerDaily(correct: boolean): L.Award {
    const a = update((s) => L.answerDaily(s, correct, Date.now()));
    if (a.xp) celebrate({ emoji: correct ? "✅" : "📚", title: correct ? "Correct!" : "Good try", subtitle: "Daily question · streak kept alive", xp: a.xp });
    announce(a);
    return a;
  },

  completeMissions(missions: Mission[]): L.Award {
    const a = update((s) => L.completeMissions(s, missions.map((m) => ({ id: m.id, xp: m.xp, reward: m.reward })), Date.now()));
    if (a.xp) {
      if (a.cash) payCash(a.cash, missions.length === 1 ? `Mission: ${missions[0].title}` : `${missions.length} missions completed`);
      successHaptic();
      celebrate({
        emoji: missions.length === 1 ? missions[0].emoji : "🗺️",
        title: missions.length === 1 ? `Mission complete: ${missions[0].title}` : `${missions.length} missions complete!`,
        subtitle: missions.length === 1 ? missions[0].detail : missions.map((m) => m.title).join(" · "),
        xp: a.xp,
        cash: a.cash,
      });
    }
    announce(a);
    return a;
  },

  flag(name: string) {
    learnStore.set((prev) => L.setFlag(L.ensureLearn(prev), name, Date.now()));
  },

  setExperience(experience: L.Experience) {
    learnStore.set((prev) => {
      const s = L.ensureLearn(prev);
      return { ...s, profile: { experience, onboarded: true } };
    });
  },

  dismissOnboarding() {
    learnStore.set((prev) => {
      const s = L.ensureLearn(prev);
      return { ...s, profile: { ...s.profile, onboarded: true } };
    });
  },

  /** Robinhood-style free share, on practice money: one whole share into the general account. */
  claimFreeShare(p: Pricer, r = Math.random()): { symbol: string; valueGbp: number } | null {
    const current = L.ensureLearn(learnStore.get());
    if (current.freeShare.claimed) return null;
    const symbol = L.pickFreeShare(r);
    if (!getInstrument(symbol) || !(p.price(symbol) > 0)) return null;
    let valueGbp = 0;
    portfolioStore.set((prev) => {
      const s = ensureState(prev);
      const gia = s.accounts.find((a) => a.type === "GIA") ?? s.accounts[0];
      const g = grantShares(s, gia.id, symbol, 1, p, `Free practice share: 1 × ${symbol}`);
      valueGbp = g.valueGbp;
      return g.state;
    });
    let badges: L.Badge[] = [];
    learnStore.set((prev) => {
      const r2 = L.claimFreeShare(L.ensureLearn(prev), symbol, Date.now());
      badges = r2.badges;
      return r2.state;
    });
    for (const b of badges) celebrate({ emoji: b.emoji, title: `Badge unlocked: ${b.title}`, subtitle: b.how });
    successHaptic();
    return { symbol, valueGbp };
  },
};
