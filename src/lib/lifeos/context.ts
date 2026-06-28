import type { Profile } from "./types";
import {
  buildBrief, buildNudges, projectCashflow, spendableBalance, netWorth,
  moneyEventsInWindow, formatGBP, nextOccurrence, daysBetween,
} from "./derive";

// Build the grounding context handed to the AI so its answers are based on
// the user's actual entered life rather than generic guesses. Built on the
// client (the profile lives in localStorage) and POSTed to /api/lifeos.
export function buildLifeContext(p: Profile, now = new Date()): string {
  const brief = buildBrief(p, now).map(b => `- ${b.when ? `[${b.when}] ` : ""}${b.text}`).join("\n") || "- (nothing scheduled)";
  const nudges = buildNudges(p, now).map(n => `- ${n.title}: ${n.detail}`).join("\n") || "- (none)";

  const flows = moneyEventsInWindow(p, now, 30)
    .map(e => `- ${e.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${e.label} (${e.category}) ${formatGBP(e.amount)}`)
    .join("\n") || "- (no movements logged)";

  const accounts = p.accounts.map(a => `- ${a.label} (${a.kind}): ${formatGBP(a.balance)}`).join("\n") || "- (no accounts added)";

  const dates = p.dates
    .map(d => ({ d, days: daysBetween(now, nextOccurrence(d, now)) }))
    .filter(x => x.days >= 0)
    .sort((a, b) => a.days - b.days)
    .map(({ d, days }) => `- ${d.label} (${d.kind}) in ${days} day${days === 1 ? "" : "s"}`)
    .join("\n") || "- (no key dates)";

  const proj = projectCashflow(p, now, 30);

  return `USER PROFILE
Name: ${p.name}
Location: ${p.location}
${p.isSample ? "NOTE: this is SAMPLE data, not the user's real life. Answer using these figures but you may gently note they're a demo.\n" : ""}
TODAY'S BRIEF
${brief}

PROACTIVE NUDGES LIFEOS HAS RAISED
${nudges}

KEY DATES COMING UP
${dates}

ACCOUNTS
${accounts}
- Spendable now (current + savings): ${formatGBP(spendableBalance(p))}
- Total net worth (incl. investments): ${formatGBP(netWorth(p))}

MONEY MOVEMENTS — NEXT 30 DAYS
${flows}

30-DAY CASHFLOW PROJECTION (spendable balance)
- Starts at: ${formatGBP(proj.start)}
- Lowest point: ${formatGBP(proj.low)}${proj.lowDate ? ` around ${proj.lowDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
- Ends at: ${formatGBP(proj.end)}`;
}
