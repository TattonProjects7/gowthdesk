import type {
  Profile, LifeDate, Bill, BriefItem, Nudge, TimelineEntry,
} from "./types";

// ---- Date helpers ---------------------------------------------------------

const MS_DAY = 86_400_000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_DAY);
}

export function relativeLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

// Natural "when" phrase: "today" / "tomorrow" / "in 12 days".
export function whenPhrase(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${relativeLabel(days).toLowerCase()}`;
}

export function formatGBP(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}£${Math.abs(Math.round(n)).toLocaleString("en-GB")}`;
}

// Next future occurrence of a saved date, honouring its recurrence.
export function nextOccurrence(item: LifeDate, now: Date): Date {
  const base = parseISO(item.date);
  const today = startOfDay(now);
  if (item.recurring === "none") return base;

  if (item.recurring === "yearly") {
    const candidate = new Date(today.getFullYear(), base.getMonth(), base.getDate());
    if (candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
    return candidate;
  }
  // monthly
  const candidate = new Date(today.getFullYear(), today.getMonth(), base.getDate());
  if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

// Next time a monthly bill leaves the account, on/after today.
export function nextBillDate(bill: Bill, now: Date): Date {
  const today = startOfDay(now);
  const day = Math.min(bill.dayOfMonth, 28); // keep it valid in every month
  const candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

// ---- Money ----------------------------------------------------------------

// What the user can actually spend right now (current + savings, not investments).
export function spendableBalance(p: Profile): number {
  return p.accounts
    .filter(a => a.kind !== "investment")
    .reduce((s, a) => s + a.balance, 0);
}

export function netWorth(p: Profile): number {
  return p.accounts.reduce((s, a) => s + a.balance, 0);
}

interface FlowEvent {
  date: Date;
  daysFromNow: number;
  label: string;
  amount: number; // signed
  category: string;
}

// All money movements (bills + one-offs) within the horizon, sorted by date.
export function moneyEventsInWindow(p: Profile, now: Date, days: number): FlowEvent[] {
  const horizon = startOfDay(now).getTime() + days * MS_DAY;
  const events: FlowEvent[] = [];

  for (const b of p.bills) {
    // a bill can recur within a long horizon — walk month by month
    const d = nextBillDate(b, now);
    while (d.getTime() <= horizon) {
      events.push({ date: new Date(d), daysFromNow: daysBetween(now, d), label: b.label, amount: -Math.abs(b.amount), category: b.category });
      d.setMonth(d.getMonth() + 1);
    }
  }

  for (const o of p.oneOffs) {
    const d = parseISO(o.date);
    const df = daysBetween(now, d);
    if (df >= 0 && df <= days) {
      events.push({ date: d, daysFromNow: df, label: o.label, amount: o.amount, category: o.category });
    }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface Projection {
  start: number;
  end: number;
  low: number;       // lowest the balance gets over the horizon
  lowDate: Date | null;
  events: FlowEvent[];
}

export function projectCashflow(p: Profile, now: Date, days: number): Projection {
  const events = moneyEventsInWindow(p, now, days);
  let bal = spendableBalance(p);
  const start = bal;
  let low = bal;
  let lowDate: Date | null = null;

  for (const e of events) {
    bal += e.amount;
    if (bal < low) { low = bal; lowDate = e.date; }
  }
  return { start, end: bal, low, lowDate, events };
}

// ---- Affordability simulator ---------------------------------------------

export interface Affordability {
  canAfford: boolean;
  lowAfter: number;       // lowest projected balance if you make the purchase
  lowWithout: number;     // lowest projected balance if you don't
  buffer: number;         // safety buffer used
  endAfter: number;       // end-of-horizon balance with the purchase
  verdict: string;
}

const SAFETY_BUFFER = 200;

// Simulate spending `amount` in `whenDays` days against real cashflow.
export function simulateAffordability(
  p: Profile, now: Date, amount: number, whenDays: number, horizonDays = 30,
): Affordability {
  const horizon = Math.max(horizonDays, whenDays + 1);
  const base = projectCashflow(p, now, horizon);

  // Re-run projection with the purchase injected.
  const events = [...base.events, {
    date: new Date(startOfDay(now).getTime() + whenDays * MS_DAY),
    daysFromNow: whenDays,
    label: "Planned purchase",
    amount: -Math.abs(amount),
    category: "Planned",
  }].sort((a, b) => a.date.getTime() - b.date.getTime());

  let bal = spendableBalance(p);
  let low = bal;
  for (const e of events) {
    bal += e.amount;
    if (bal < low) low = bal;
  }

  const canAfford = low >= SAFETY_BUFFER;
  const verdict = canAfford
    ? `Yes — even after spending ${formatGBP(amount)}, your balance never drops below ${formatGBP(low)}, staying above your ${formatGBP(SAFETY_BUFFER)} safety buffer.`
    : `Risky — spending ${formatGBP(amount)} would pull you down to ${formatGBP(low)}, below your ${formatGBP(SAFETY_BUFFER)} safety buffer. Wait for incoming money or trim the amount.`;

  return { canAfford, lowAfter: low, lowWithout: base.low, buffer: SAFETY_BUFFER, endAfter: bal, verdict };
}

// ---- Today's brief --------------------------------------------------------

export function buildBrief(p: Profile, now: Date): BriefItem[] {
  const items: BriefItem[] = [];

  // Upcoming dates within the next 14 days
  const upcoming = p.dates
    .map(d => ({ d, when: nextOccurrence(d, now), days: daysBetween(now, nextOccurrence(d, now)) }))
    .filter(x => x.days >= 0 && x.days <= 14)
    .sort((a, b) => a.days - b.days);

  for (const { d, days } of upcoming) {
    const icon = d.kind === "birthday" ? "Gift" : d.kind === "renewal" ? "ShieldAlert" : d.kind === "appointment" ? "Calendar" : "CalendarClock";
    const tone = d.kind === "renewal" ? "warn" : "neutral";
    const time = d.note && /\d/.test(d.note) ? ` (${d.note})` : "";
    items.push({
      id: `date-${d.id}`,
      icon,
      text: days === 0 ? `${d.label}${time}` : `${d.label} — ${relativeLabel(days).toLowerCase()}`,
      tone,
      when: relativeLabel(days),
      checkable: d.kind === "appointment",
    });
  }

  // Money leaving today / very soon
  const soon = moneyEventsInWindow(p, now, 7);
  for (const e of soon) {
    if (e.amount < 0 && e.daysFromNow <= 2) {
      items.push({
        id: `flow-${e.label}-${e.daysFromNow}`,
        icon: "Receipt",
        text: `${e.label} — ${formatGBP(e.amount)} ${e.daysFromNow === 0 ? "leaves today" : `in ${e.daysFromNow}d`}`,
        tone: "money",
        when: relativeLabel(e.daysFromNow),
      });
    }
  }

  // Steps / health
  const { steps, stepGoal } = p.checkin;
  if (stepGoal > 0) {
    const hit = steps >= stepGoal;
    items.push({
      id: "steps",
      icon: "Footprints",
      text: hit
        ? `You've hit your step goal — ${steps.toLocaleString()} steps`
        : `You've walked ${steps.toLocaleString()} steps — ${(stepGoal - steps).toLocaleString()} to go`,
      tone: hit ? "good" : "neutral",
      checkable: false,
    });
  }

  return items;
}

// ---- Proactive nudges -----------------------------------------------------

export function buildNudges(p: Profile, now: Date): Nudge[] {
  const nudges: Nudge[] = [];

  // Gift reminder for birthdays in the next 14 days
  for (const d of p.dates) {
    if (d.kind !== "birthday") continue;
    const days = daysBetween(now, nextOccurrence(d, now));
    if (days >= 0 && days <= 14) {
      nudges.push({
        id: `gift-${d.id}`,
        icon: "Gift",
        title: `Sort ${d.label.replace(/'s birthday.*/i, "")}'s gift`,
        detail: `Birthday ${whenPhrase(days)}. Order today so it arrives in time.`,
        tone: days <= 5 ? "warn" : "neutral",
      });
    }
  }

  // Cashflow shortfall warning
  const proj = projectCashflow(p, now, 30);
  if (proj.low < SAFETY_BUFFER && proj.lowDate) {
    nudges.push({
      id: "shortfall",
      icon: "TrendingDown",
      title: `Tight around ${proj.lowDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      detail: `Your balance is projected to dip to ${formatGBP(proj.low)}. Hold off on big spends until your next money in.`,
      tone: "warn",
    });
  } else if (proj.end > proj.start) {
    nudges.push({
      id: "surplus",
      icon: "PiggyBank",
      title: "You're building a surplus",
      detail: `On track to finish the month around ${formatGBP(proj.end)} spendable. Consider moving some to savings.`,
      tone: "good",
    });
  }

  // Renewal heads-up — chance to shop around
  for (const d of p.dates) {
    if (d.kind !== "renewal") continue;
    const days = daysBetween(now, nextOccurrence(d, now));
    if (days >= 0 && days <= 7) {
      nudges.push({
        id: `renewal-${d.id}`,
        icon: "RefreshCw",
        title: `${d.label} soon`,
        detail: `Renews ${whenPhrase(days)} — worth a 5-minute compare before it auto-renews.`,
        tone: "neutral",
      });
    }
  }

  // Health nudge
  const { steps, stepGoal } = p.checkin;
  if (stepGoal > 0 && steps < stepGoal * 0.5) {
    nudges.push({
      id: "move",
      icon: "Footprints",
      title: "Get moving",
      detail: `You're under halfway to your ${stepGoal.toLocaleString()} step goal. A short walk now closes the gap.`,
      tone: "neutral",
    });
  }

  return nudges;
}

// ---- Smart timeline -------------------------------------------------------

export function buildTimeline(p: Profile, now: Date, days = 30): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Money movements with running projected balance
  let bal = spendableBalance(p);
  const money = moneyEventsInWindow(p, now, days);
  const moneyEntries: TimelineEntry[] = money.map((e, i) => {
    bal += e.amount;
    return {
      id: `m-${i}-${e.label}`,
      date: e.date.toISOString().slice(0, 10),
      daysFromNow: e.daysFromNow,
      label: e.label,
      icon: e.amount >= 0 ? "ArrowDownLeft" : "ArrowUpRight",
      amount: e.amount,
      balanceAfter: bal,
      kind: e.amount >= 0 ? "money-in" : "money-out",
    };
  });
  entries.push(...moneyEntries);

  // Key dates
  for (const d of p.dates) {
    const when = nextOccurrence(d, now);
    const df = daysBetween(now, when);
    if (df >= 0 && df <= days) {
      entries.push({
        id: `d-${d.id}`,
        date: when.toISOString().slice(0, 10),
        daysFromNow: df,
        label: d.label,
        icon: d.kind === "birthday" ? "Gift" : d.kind === "renewal" ? "ShieldAlert" : d.kind === "appointment" ? "Calendar" : "CalendarClock",
        kind: "date",
      });
    }
  }

  return entries.sort((a, b) => a.daysFromNow - b.daysFromNow || (a.kind === "date" ? 1 : -1));
}
