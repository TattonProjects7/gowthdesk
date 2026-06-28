// LifeOS — the "second brain" data layer.
//
// In a real product these fields would be hydrated live from connected
// accounts (Gmail, bank, calendar, Apple Health, etc.). For this prototype
// they're a realistic snapshot of one person's life so the dashboard and the
// AI assistant have something concrete to reason over.

export interface Integration {
  key: string;
  name: string;
  status: "connected" | "syncing" | "available";
  detail: string;
  emoji: string;
}

export interface BriefItem {
  key: string;
  icon: string;            // lucide icon name, resolved in the UI
  text: string;
  tone: "neutral" | "warn" | "good" | "money";
  when?: string;
}

export interface MoneyFlow {
  label: string;
  amount: number;          // negative = out, positive = in
  date: string;
  category: string;
}

export const USER = {
  name: "Dave",
  location: "Manchester, UK",
  // A round figure the user told LifeOS they have to play with this month.
  discretionaryThisMonth: 4000,
};

export const INTEGRATIONS: Integration[] = [
  { key: "gmail",       name: "Gmail",        status: "connected", detail: "3 unread that need you", emoji: "📧" },
  { key: "calendar",    name: "Calendar",     status: "connected", detail: "2 events today",          emoji: "📅" },
  { key: "bank",        name: "Bank",         status: "connected", detail: "Monzo · Barclays",        emoji: "🏦" },
  { key: "whatsapp",    name: "WhatsApp",     status: "connected", detail: "Ana, Mum, Site group",    emoji: "💬" },
  { key: "health",      name: "Apple Health", status: "connected", detail: "2,300 steps today",       emoji: "❤️" },
  { key: "photos",      name: "Photos",       status: "connected", detail: "Last backup 2h ago",      emoji: "📷" },
  { key: "notes",       name: "Notes",        status: "connected", detail: "12 notes",                emoji: "📝" },
  { key: "car",         name: "Car",          status: "connected", detail: "Ford Transit · 64% fuel", emoji: "🚐" },
  { key: "amazon",      name: "Amazon",       status: "connected", detail: "1 parcel arriving today", emoji: "📦" },
  { key: "energy",      name: "Energy bills",  status: "connected", detail: "Octopus · £148/mo",       emoji: "⚡" },
  { key: "hmrc",        name: "HMRC",         status: "syncing",   detail: "Self-assessment due Jan",  emoji: "🏛️" },
  { key: "investments", name: "Investments",  status: "connected", detail: "£12,480 · +1.2% today",   emoji: "📈" },
];

// The morning brief — assembled from across the connected accounts.
export const BRIEF: BriefItem[] = [
  { key: "meeting",   icon: "Calendar",   text: "Meeting at 10am with the Hadfield Road client",        tone: "neutral", when: "10:00" },
  { key: "insurance", icon: "ShieldAlert",text: "Your van insurance renews tomorrow (£62/mo, Aviva)",   tone: "warn",    when: "Tomorrow" },
  { key: "birthday",  icon: "Gift",       text: "Ana's birthday in 12 days — you've not bought anything",tone: "neutral", when: "12 days" },
  { key: "nursery",   icon: "Baby",       text: "Ethan's nursery payment of £540 leaves today",         tone: "money",   when: "Today" },
  { key: "screwfix",  icon: "Receipt",    text: "You owe £420 to Screwfix (account due in 6 days)",      tone: "money",   when: "6 days" },
  { key: "steps",     icon: "Footprints", text: "You've walked 2,300 steps — well below your 8k goal",   tone: "neutral" },
  { key: "weather",   icon: "CloudRain",  text: "Rain at 2pm, so leave the Stockport site earlier",     tone: "warn",    when: "14:00" },
];

// Recent + upcoming money movements LifeOS can see across accounts.
export const CASHFLOW: MoneyFlow[] = [
  { label: "Nursery — Little Acorns", amount: -540, date: "Today",      category: "Childcare" },
  { label: "Van insurance — Aviva",   amount: -62,  date: "Tomorrow",   category: "Vehicle" },
  { label: "Screwfix account",        amount: -420, date: "In 6 days",  category: "Materials" },
  { label: "Energy — Octopus",        amount: -148, date: "In 9 days",  category: "Bills" },
  { label: "Mortgage",                amount: -1120,date: "In 11 days", category: "Home" },
  { label: "Client invoice #3041",    amount: 2800, date: "In 4 days",  category: "Income" },
  { label: "Client invoice #3042",    amount: 1650, date: "In 14 days", category: "Income" },
];

// A few example questions to seed the assistant UI.
export const SUGGESTED_QUESTIONS = [
  "I've got £4,000 this month — can I afford a holiday?",
  "What should I get Ana for her birthday?",
  "Am I on track to pay my self-assessment tax?",
  "What's the most important thing I'm forgetting today?",
];

// Build the grounding context handed to the AI so its answers are based on
// Dave's actual life rather than generic guesses.
export function buildLifeContext(): string {
  const money = CASHFLOW.map(
    m => `- ${m.date}: ${m.label} (${m.category}) ${m.amount < 0 ? "-" : "+"}£${Math.abs(m.amount)}`
  ).join("\n");

  const brief = BRIEF.map(b => `- ${b.when ? `[${b.when}] ` : ""}${b.text}`).join("\n");

  const connected = INTEGRATIONS
    .filter(i => i.status !== "available")
    .map(i => `- ${i.name}: ${i.detail}`)
    .join("\n");

  const committed = CASHFLOW.filter(m => m.amount < 0).reduce((s, m) => s + m.amount, 0);
  const incoming = CASHFLOW.filter(m => m.amount > 0).reduce((s, m) => s + m.amount, 0);

  return `USER PROFILE
Name: ${USER.name}
Location: ${USER.location}
Discretionary budget the user mentioned for this month: £${USER.discretionaryThisMonth}

TODAY'S BRIEF
${brief}

CONNECTED ACCOUNTS (live data LifeOS can see)
${connected}

UPCOMING & RECENT MONEY MOVEMENTS
${money}

MONEY SUMMARY
- Committed outgoings still to leave: £${Math.abs(committed)}
- Income still incoming: £${incoming}
- Net position once everything clears: ${incoming + committed >= 0 ? "+" : "-"}£${Math.abs(incoming + committed)}`;
}
