// LifeOS data model. Everything the app knows about a person lives in a
// single Profile object, persisted locally on the device (localStorage).
// No fabricated facts: the app ships with a clearly-labelled sample, and
// onboarding replaces it with the user's own real data.

export type DateKind = "birthday" | "renewal" | "event" | "appointment";
export type Recurrence = "none" | "yearly" | "monthly";

export interface LifeDate {
  id: string;
  label: string;        // e.g. "Ana's birthday"
  date: string;         // ISO yyyy-mm-dd (the next/absolute occurrence the user entered)
  kind: DateKind;
  recurring: Recurrence;
  note?: string;
}

export interface Bill {
  id: string;
  label: string;        // e.g. "Nursery — Little Acorns"
  amount: number;       // positive £ that leaves the account
  dayOfMonth: number;   // 1–31, the day it goes out
  category: string;
}

export interface OneOff {
  id: string;
  label: string;
  amount: number;       // signed: + money in, − money out
  date: string;         // ISO yyyy-mm-dd
  category: string;
}

export type AccountKind = "current" | "savings" | "investment";

export interface Account {
  id: string;
  label: string;
  balance: number;
  kind: AccountKind;
}

export interface CheckinState {
  date: string;         // ISO day this check-in applies to
  done: string[];       // ids of brief items ticked off
  steps: number;
  stepGoal: number;
  mood?: 1 | 2 | 3 | 4 | 5;
}

export interface Profile {
  version: number;
  isSample: boolean;    // true until the user completes onboarding
  name: string;
  location: string;
  dates: LifeDate[];
  bills: Bill[];
  oneOffs: OneOff[];
  accounts: Account[];
  checkin: CheckinState;
}

// ---- Derived (computed, never stored) -------------------------------------

export type Tone = "neutral" | "warn" | "good" | "money";

export interface BriefItem {
  id: string;
  icon: string;         // lucide icon name, resolved in the UI
  text: string;
  tone: Tone;
  when?: string;        // short relative label e.g. "Today", "Tomorrow"
  checkable?: boolean;  // can it be ticked off in the daily check-in
}

export interface Nudge {
  id: string;
  icon: string;
  title: string;
  detail: string;
  tone: Tone;
}

export interface TimelineEntry {
  id: string;
  date: string;         // ISO
  daysFromNow: number;
  label: string;
  icon: string;
  amount?: number;      // signed money impact if any
  balanceAfter?: number;// projected balance after this entry
  kind: "money-in" | "money-out" | "date";
}
