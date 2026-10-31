// Learning progress — XP, levels, streaks, badges, missions and rewards.
//
// Pure functions over LearnState so every rule is unit-tested. The "fun" is
// deliberately pointed at learning and good investing habits (diversifying,
// protecting positions, using an ISA, regular saving) — never at trading more.
// Robinhood dropped its trade confetti in 2021 after regulators criticised it
// as gamifying trading; Shortlist celebrates lessons and habits instead.

import { LESSONS, TRACKS, lessonsFor, type TrackId } from "./content";

export type Experience = "beginner" | "intermediate" | "advanced";

export interface LearnState {
  version: 1;
  xp: number;
  earned: number; // practice £ earned through Learn & Earn and missions
  lessons: Record<string, { score: number; total: number; at: number; best: number }>;
  streak: { count: number; best: number; lastDay: string | null };
  badges: Record<string, number>; // id → unlocked at
  missions: Record<string, number>; // id → completed at
  daily: Record<string, { correct: boolean }>; // day → result
  freeShare: { claimed: boolean; symbol?: string; at?: number };
  profile: { experience: Experience | null; onboarded: boolean };
  flags: Record<string, number>; // one-off events: "coach", "lookthrough"…
}

export function initialLearn(): LearnState {
  return {
    version: 1,
    xp: 0,
    earned: 0,
    lessons: {},
    streak: { count: 0, best: 0, lastDay: null },
    badges: {},
    missions: {},
    daily: {},
    freeShare: { claimed: false },
    profile: { experience: null, onboarded: false },
    flags: {},
  };
}

export function ensureLearn(raw: unknown): LearnState {
  const base = initialLearn();
  const s = (raw ?? {}) as Partial<LearnState>;
  return {
    ...base,
    ...s,
    lessons: s.lessons ?? {},
    streak: { ...base.streak, ...(s.streak ?? {}) },
    badges: s.badges ?? {},
    missions: s.missions ?? {},
    daily: s.daily ?? {},
    freeShare: { ...base.freeShare, ...(s.freeShare ?? {}) },
    profile: { ...base.profile, ...(s.profile ?? {}) },
    flags: s.flags ?? {},
    version: 1,
  };
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export const LEVELS = [
  { at: 0, title: "Curious" },
  { at: 150, title: "Saver" },
  { at: 400, title: "Investor" },
  { at: 800, title: "Analyst" },
  { at: 1300, title: "Strategist" },
  { at: 2000, title: "Portfolio Pro" },
  { at: 3000, title: "Market Master" },
];

export interface LevelInfo {
  level: number; // 1-based
  title: string;
  floor: number;
  next: number | null;
  pct: number; // progress to next level, 0–100
}

export function levelFor(xp: number): LevelInfo {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].at) i++;
  const floor = LEVELS[i].at;
  const next = i + 1 < LEVELS.length ? LEVELS[i + 1].at : null;
  const pct = next == null ? 100 : Math.round(((xp - floor) / (next - floor)) * 100);
  return { level: i + 1, title: LEVELS[i].title, floor, next, pct };
}

// ---------------------------------------------------------------------------
// Streaks — a day counts when you finish a lesson or answer the daily question.
// ---------------------------------------------------------------------------

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400_000);
}

export function bumpStreak(streak: LearnState["streak"], now: number): LearnState["streak"] {
  const today = dayKey(now);
  if (streak.lastDay === today) return streak;
  const gap = streak.lastDay ? daysBetween(streak.lastDay, today) : Infinity;
  const count = gap === 1 ? streak.count + 1 : 1;
  return { count, best: Math.max(streak.best, count), lastDay: today };
}

/** The streak as it should be displayed today (broken streaks show as 0). */
export function liveStreak(streak: LearnState["streak"], now: number): number {
  if (!streak.lastDay) return 0;
  const gap = daysBetween(streak.lastDay, dayKey(now));
  return gap <= 1 ? streak.count : 0;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  how: string;
}

export const BADGES: Badge[] = [
  { id: "first-lesson", emoji: "🎓", title: "First lesson", how: "Finish any lesson" },
  { id: "perfect", emoji: "💯", title: "Perfect score", how: "Get every quiz question right" },
  { id: "streak-3", emoji: "🔥", title: "On a roll", how: "Learn 3 days in a row" },
  { id: "streak-7", emoji: "🌋", title: "Unstoppable", how: "Learn 7 days in a row" },
  { id: "free-share", emoji: "🎁", title: "Lucky dip", how: "Claim your free practice share" },
  { id: "first-mission", emoji: "🧭", title: "Explorer", how: "Complete a mission" },
  { id: "five-missions", emoji: "🗺️", title: "Trailblazer", how: "Complete 5 missions" },
  { id: "coach", emoji: "🤖", title: "Curious mind", how: "Ask the AI coach a question" },
  { id: "level-3", emoji: "📈", title: "Investor", how: "Reach level 3" },
  { id: "level-5", emoji: "🏆", title: "Strategist", how: "Reach level 5" },
  ...TRACKS.map((t) => ({ id: `track-${t.id}`, emoji: t.emoji, title: `${t.title} graduate`, how: `Finish every ${t.title} lesson` })),
];

export function trackProgress(s: LearnState, track: TrackId): { done: number; total: number } {
  const ls = lessonsFor(track);
  return { done: ls.filter((l) => s.lessons[l.id]).length, total: ls.length };
}

/** Recompute which badges are now earned; returns the new state and the newly unlocked ones. */
export function syncBadges(s: LearnState, now: number): { state: LearnState; unlocked: Badge[] } {
  const has = (id: string) => Boolean(s.badges[id]);
  const earned = new Set<string>();
  const lessons = Object.values(s.lessons);
  if (lessons.length >= 1) earned.add("first-lesson");
  if (lessons.some((l) => l.best >= l.total && l.total > 0)) earned.add("perfect");
  if (s.streak.best >= 3) earned.add("streak-3");
  if (s.streak.best >= 7) earned.add("streak-7");
  if (s.freeShare.claimed) earned.add("free-share");
  const missions = Object.keys(s.missions).length;
  if (missions >= 1) earned.add("first-mission");
  if (missions >= 5) earned.add("five-missions");
  if (s.flags.coach) earned.add("coach");
  const lvl = levelFor(s.xp).level;
  if (lvl >= 3) earned.add("level-3");
  if (lvl >= 5) earned.add("level-5");
  for (const t of TRACKS) {
    const p = trackProgress(s, t.id);
    if (p.total > 0 && p.done === p.total) earned.add(`track-${t.id}`);
  }
  const unlocked = BADGES.filter((b) => earned.has(b.id) && !has(b.id));
  if (!unlocked.length) return { state: s, unlocked };
  const badges = { ...s.badges };
  for (const b of unlocked) badges[b.id] = now;
  return { state: { ...s, badges }, unlocked };
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export interface Award {
  state: LearnState;
  xp: number;
  cash: number; // practice £ to credit to the portfolio
  firstTime: boolean;
  perfect: boolean;
  leveledUp: LevelInfo | null;
  badges: Badge[];
}

/** Record a finished lesson. XP for the first completion (+50% if perfect); a perfect retake of an imperfect first try earns the bonus later. Cash is paid once. */
export function completeLesson(s: LearnState, lessonId: string, score: number, total: number, now: number): Award {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return { state: s, xp: 0, cash: 0, firstTime: false, perfect: false, leveledUp: null, badges: [] };
  const prev = s.lessons[lessonId];
  const perfect = score >= total && total > 0;
  const bonus = Math.round(lesson.xp * 0.5);
  let xp = 0;
  if (!prev) xp = lesson.xp + (perfect ? bonus : 0);
  else if (perfect && prev.best < prev.total) xp = bonus;
  const cash = prev ? 0 : lesson.reward;
  const before = levelFor(s.xp);
  let state: LearnState = {
    ...s,
    xp: s.xp + xp,
    earned: Math.round((s.earned + cash) * 100) / 100,
    lessons: { ...s.lessons, [lessonId]: { score, total, at: now, best: Math.max(score, prev?.best ?? 0) } },
    streak: bumpStreak(s.streak, now),
  };
  const after = levelFor(state.xp);
  const b = syncBadges(state, now);
  state = b.state;
  return { state, xp, cash, firstTime: !prev, perfect, leveledUp: after.level > before.level ? after : null, badges: b.unlocked };
}

/** The lesson to suggest next: first unfinished lesson, starting from the learner's recommended track. */
export function suggestedLesson(s: LearnState, startTrack: TrackId = "basics") {
  const order = [startTrack, ...TRACKS.map((t) => t.id).filter((t) => t !== startTrack)];
  for (const t of order) {
    const next = lessonsFor(t).find((l) => !s.lessons[l.id]);
    if (next) return next;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Daily question
// ---------------------------------------------------------------------------

export function dailyQuestion(now: number) {
  const pool = LESSONS.flatMap((l) => l.quiz.map((q) => ({ ...q, lessonId: l.id })));
  const day = Math.floor(now / 86400_000);
  // Stride through the pool so consecutive days hit different topics.
  return pool[(day * 7) % pool.length];
}

export function answerDaily(s: LearnState, correct: boolean, now: number): Award {
  const key = dayKey(now);
  if (s.daily[key]) return { state: s, xp: 0, cash: 0, firstTime: false, perfect: false, leveledUp: null, badges: [] };
  const xp = correct ? 25 : 10;
  const before = levelFor(s.xp);
  let state: LearnState = { ...s, xp: s.xp + xp, daily: { ...s.daily, [key]: { correct } }, streak: bumpStreak(s.streak, now) };
  const b = syncBadges(state, now);
  state = b.state;
  const after = levelFor(state.xp);
  return { state, xp, cash: 0, firstTime: true, perfect: correct, leveledUp: after.level > before.level ? after : null, badges: b.unlocked };
}

// ---------------------------------------------------------------------------
// Flags, free share and missions
// ---------------------------------------------------------------------------

export function setFlag(s: LearnState, flag: string, now: number): LearnState {
  if (s.flags[flag]) return s;
  return { ...s, flags: { ...s.flags, [flag]: now } };
}

export function claimFreeShare(s: LearnState, symbol: string, now: number): { state: LearnState; badges: Badge[] } {
  if (s.freeShare.claimed) return { state: s, badges: [] };
  const b = syncBadges({ ...s, freeShare: { claimed: true, symbol, at: now } }, now);
  return { state: b.state, badges: b.unlocked };
}

export function completeMissions(s: LearnState, done: { id: string; xp: number; reward: number }[], now: number): Award {
  const fresh = done.filter((m) => !s.missions[m.id]);
  if (!fresh.length) return { state: s, xp: 0, cash: 0, firstTime: false, perfect: false, leveledUp: null, badges: [] };
  const xp = fresh.reduce((a, m) => a + m.xp, 0);
  const cash = fresh.reduce((a, m) => a + m.reward, 0);
  const before = levelFor(s.xp);
  const missions = { ...s.missions };
  for (const m of fresh) missions[m.id] = now;
  let state: LearnState = { ...s, xp: s.xp + xp, earned: Math.round((s.earned + cash) * 100) / 100, missions };
  const b = syncBadges(state, now);
  state = b.state;
  const after = levelFor(state.xp);
  return { state, xp, cash, firstTime: true, perfect: false, leveledUp: after.level > before.level ? after : null, badges: b.unlocked };
}

// Weighted pool for the free practice share. Like Robinhood's claim-a-stock,
// most people get an everyday share and a lucky few get a big name.
export const FREE_SHARE_POOL: { symbol: string; weight: number }[] = [
  { symbol: "LLOY", weight: 24 },
  { symbol: "VOD", weight: 20 },
  { symbol: "BARC", weight: 13 },
  { symbol: "BP", weight: 10 },
  { symbol: "TSCO", weight: 9 },
  { symbol: "RR", weight: 8 },
  { symbol: "GSK", weight: 5 },
  { symbol: "DIS", weight: 4 },
  { symbol: "AMD", weight: 3 },
  { symbol: "AAPL", weight: 2 },
  { symbol: "NVDA", weight: 1.5 },
  { symbol: "AZN", weight: 0.5 },
];

/** Pick a symbol from the pool for a random number r in [0, 1). */
export function pickFreeShare(r: number): string {
  const total = FREE_SHARE_POOL.reduce((a, x) => a + x.weight, 0);
  let t = r * total;
  for (const x of FREE_SHARE_POOL) {
    if (t < x.weight) return x.symbol;
    t -= x.weight;
  }
  return FREE_SHARE_POOL[0].symbol;
}
