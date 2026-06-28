import type { Profile } from "./types";

const KEY = "lifeos.profile.v1";

// A unique-enough id without pulling in a dependency.
export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function todayKey(now: Date): string {
  return iso(now);
}

// A clearly-labelled SAMPLE life so the app isn't empty on first run.
// Dates are generated relative to "now" so the demo always feels current,
// and isSample stays true until the user makes it their own.
export function createSampleProfile(now = new Date()): Profile {
  return {
    version: 1,
    isSample: true,
    name: "there",
    location: "United Kingdom",
    dates: [
      { id: uid("d"), label: "Sample: a friend's birthday", date: iso(addDays(now, 12)), kind: "birthday",    recurring: "yearly", note: "Replace with your own in setup" },
      { id: uid("d"), label: "Sample: van insurance renews", date: iso(addDays(now, 1)),  kind: "renewal",     recurring: "yearly" },
      { id: uid("d"), label: "Sample: client meeting",       date: iso(addDays(now, 0)),  kind: "appointment", recurring: "none", note: "10:00" },
      { id: uid("d"), label: "Sample: self-assessment due",  date: iso(addDays(now, 30)), kind: "renewal",     recurring: "yearly" },
    ],
    bills: [
      { id: uid("b"), label: "Sample: nursery",   amount: 540,  dayOfMonth: dayOf(addDays(now, 0)),  category: "Childcare" },
      { id: uid("b"), label: "Sample: mortgage",  amount: 1120, dayOfMonth: dayOf(addDays(now, 11)), category: "Home" },
      { id: uid("b"), label: "Sample: energy",    amount: 148,  dayOfMonth: dayOf(addDays(now, 9)),  category: "Bills" },
    ],
    oneOffs: [
      { id: uid("o"), label: "Sample: Screwfix account",  amount: -420,  date: iso(addDays(now, 6)),  category: "Materials" },
      { id: uid("o"), label: "Sample: client invoice",    amount: 2800,  date: iso(addDays(now, 4)),  category: "Income" },
      { id: uid("o"), label: "Sample: client invoice",    amount: 1650,  date: iso(addDays(now, 14)), category: "Income" },
    ],
    accounts: [
      { id: uid("a"), label: "Sample current account", balance: 1840,  kind: "current" },
      { id: uid("a"), label: "Sample savings",         balance: 3600,  kind: "savings" },
      { id: uid("a"), label: "Sample investments",     balance: 12480, kind: "investment" },
    ],
    checkin: { date: todayKey(now), done: [], steps: 2300, stepGoal: 8000 },
  };
}

// An empty profile to start from when the user chooses to enter their own life.
export function createBlankProfile(name: string, location: string, now = new Date()): Profile {
  return {
    version: 1,
    isSample: false,
    name: name.trim() || "there",
    location: location.trim() || "United Kingdom",
    dates: [],
    bills: [],
    oneOffs: [],
    accounts: [],
    checkin: { date: todayKey(now), done: [], steps: 0, stepGoal: 8000 },
  };
}

function dayOf(d: Date): number {
  return d.getDate();
}

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    return rolloverCheckin(parsed);
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

// If the stored check-in is from a previous day, start a fresh one (keep goal).
function rolloverCheckin(p: Profile, now = new Date()): Profile {
  const today = todayKey(now);
  if (p.checkin?.date === today) return p;
  return {
    ...p,
    checkin: { date: today, done: [], steps: 0, stepGoal: p.checkin?.stepGoal ?? 8000 },
  };
}
