// The offline coach and digest — used when no AI key is configured, when the
// AI is unavailable, and as an instant first answer. Deterministic, grounded
// in the app's own data and lessons, and always educational in tone.

import { GLOSSARY, LESSONS, findTerm, getLesson } from "../learn/content";
import type { ChatMessage, CoachContext, Digest, DigestInput } from "./types";

const gbp = (n: number) => `£${n.toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 0 : 2 })}`;
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const lessonLink = (id?: string) => {
  const l = id ? getLesson(id) : undefined;
  return l ? `[${l.title}](/learn/${l.id})` : "";
};

const DISCLAIMER = "_Educational guidance on paper money, not financial advice._";

export function offlineCoach(messages: ChatMessage[], ctx: CoachContext): string {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const q = last.toLowerCase();
  const inst = ctx.instrument;

  // 1. Should I buy / sell X?  → a decision framework, never a recommendation.
  if (/\b(should i|is it a good time|buy or sell|worth buying|will it go up|will it go down)\b/.test(q)) {
    const name = inst ? inst.name : "an investment";
    return [
      `I can't tell you whether to buy or sell${inst ? ` ${inst.symbol}` : ""} — but here's the checklist good investors run through for ${name}:`,
      "",
      "1. **Why do you want it?** Write one sentence on what the company or fund does and why it should be worth more in five years.",
      "2. **How much could you lose?** Decide your maximum loss first, then size the position from your stop — see " + lessonLink("position-sizing") + ".",
      "3. **Does it fit your mix?** If it pushes one company or sector above ~10–20% of your money, that's concentration risk.",
      "4. **What's the case against?** Read the strongest argument that you're wrong before you act.",
      inst ? `\nRight now ${inst.symbol} is ${pct(inst.dayChangePct)} today and ${pct(inst.trend30Pct)} over 30 days, with RSI at ${Math.round(inst.rsi)}${inst.rsi >= 70 ? " (stretched)" : inst.rsi <= 30 ? " (washed out)" : ""}.` : "",
      "",
      DISCLAIMER,
    ].join("\n");
  }

  // 2. Why is it moving?
  if (inst && /\b(why|moving|move|up|down|drop|fall|rise|jump|crash)\b/.test(q) && /\b(why|what'?s happening|moving)\b/.test(q)) {
    const d = offlineDigest({
      symbol: inst.symbol,
      name: inst.name,
      type: inst.type,
      currency: inst.currency,
      price: inst.price,
      dayChangePct: inst.dayChangePct,
      trend30Pct: inst.trend30Pct,
      rsi: inst.rsi,
      zscore: 0,
      dailyVolPct: inst.dailyVolPct,
      aboveTrend: inst.aboveTrend,
      sentimentLongPct: 50,
      headlines: [],
    });
    return [`**${d.headline}**`, "", ...d.bullets.map((b) => `- ${b}`), "", d.takeaway, "", DISCLAIMER].join("\n");
  }

  // 3. "Explain VWRL" / "risks of VWRL" — describe the instrument on screen.
  if (inst && mentions(q, inst) && /\b(explain|tell me about|what is|what's|describe|new to|risks?|safe|like i'?m)\b/.test(q)) {
    return explainInstrument(inst, /\brisks?\b|\bsafe\b/.test(q));
  }

  // 4. Portfolio / health questions.
  if (/\b(portfolio|my holdings|diversif|health|score|rebalance|how am i doing|my investments)\b/.test(q)) {
    const p = ctx.portfolio;
    const h = ctx.health;
    if (!p || p.invested <= 0) {
      return [
        "You haven't invested anything yet, so there's nothing to review — but that's the perfect time to plan.",
        "",
        "- Many people start with a **global tracker** like VWRL as a core holding.",
        "- Add a **savings plan** so you invest a little every month.",
        `- Learn the basics first: ${lessonLink("what-is-an-etf")} and ${lessonLink("risk-and-return")}.`,
        "",
        DISCLAIMER,
      ].join("\n");
    }
    const top = p.holdings.slice(0, 3).map((x) => `${x.symbol} ${x.weightPct.toFixed(0)}%`).join(", ");
    const lines = [
      `Your portfolio is worth **${gbp(p.totalValue)}** (${gbp(p.invested)} invested, ${gbp(p.cash)} cash), ${pct(p.totalReturnPct)} all time.`,
      `Biggest positions: ${top}.`,
    ];
    if (h && h.score != null) {
      lines.push("", `**Health score: ${h.score}/100 (${h.grade}).** ${h.summary}`);
      for (const i of h.issues.slice(0, 3)) lines.push(`- **${i.label}:** ${i.detail} ${i.tip}`);
    }
    lines.push("", "Want me to explain any of these in more detail?", "", DISCLAIMER);
    return lines.join("\n");
  }

  // 5. UK accounts & tax.
  if (/\b(isa|sipp|pension|tax|cgt|capital gains|allowance)\b/.test(q)) {
    return [
      "Quick guide to the UK wrappers:",
      "",
      "- **Stocks & Shares ISA** — up to **£20,000 a year**, gains and income free of UK tax. Flexible: withdraw any time.",
      "- **SIPP** — a pension. Pay in £80 and basic-rate relief makes it £100. Locked until 55 (57 from April 2028).",
      "- **General account** — no limit, but gains above **£3,000** and dividends above **£500** a year can be taxed.",
      "",
      `Many people fill an ISA first. More in ${lessonLink("isas")} and ${lessonLink("sipps")}.`,
      "",
      DISCLAIMER,
    ].join("\n");
  }

  // 6. Glossary term.
  const term = findTerm(q);
  if (term) {
    const extra =
      inst && /rsi/i.test(term.term)
        ? ` ${inst.symbol}'s RSI is ${Math.round(inst.rsi)} right now.`
        : inst && /volatil/i.test(term.term)
          ? ` ${inst.symbol} moves about ${inst.dailyVolPct.toFixed(1)}% on a typical day.`
          : "";
    return [`**${term.term}** — ${term.short}${extra}`, "", term.lesson ? `Learn it properly in ${lessonLink(term.lesson)} (2–3 minutes, earns XP and practice cash).` : "", "", DISCLAIMER].join("\n");
  }

  // 7. Getting started.
  if (/\b(start|begin|beginner|new to|how do i|where do i|first)\b/.test(q)) {
    return [
      "Great place to start. A simple first week:",
      "",
      `1. Do ${lessonLink("what-is-a-share")} and ${lessonLink("what-is-an-etf")} in the Academy (each pays practice cash).`,
      "2. Claim your free practice share on the Portfolio tab.",
      "3. Put a small amount into a global tracker like VWRL.",
      "4. Set a price alert and a monthly savings plan.",
      "",
      "Everything is paper money, so it's a safe place to make mistakes.",
    ].join("\n");
  }

  // 8. Lesson-specific follow-up.
  if (ctx.lesson) {
    const l = getLesson(ctx.lesson.id);
    if (l) {
      return [`In **${l.title}**, the key ideas are:`, "", ...l.cards.map((c) => `- **${c.title}** — ${c.body}`), "", "Ask me about any of these in your own words."].join("\n");
    }
  }

  const suggestions = LESSONS.slice(0, 3).map((l) => lessonLink(l.id));
  return [
    "I'm your Shortlist coach. I can explain any investing term, review your portfolio, break down why a share is moving, or point you to the right lesson.",
    "",
    "Try asking:",
    "- \"What's an ETF?\"",
    "- \"How healthy is my portfolio?\"",
    inst ? `- "Why is ${inst.symbol} moving?"` : '- "What\'s the difference between an ISA and a SIPP?"',
    "",
    `Or start with ${suggestions.join(", ")}.`,
    ctx.lessonsDone === 0 ? `\nThere are ${GLOSSARY.length} terms in the glossary and ${LESSONS.length} lessons to explore.` : "",
  ].join("\n");
}

function mentions(q: string, inst: NonNullable<CoachContext["instrument"]>): boolean {
  const first = inst.name.toLowerCase().split(/\s+/)[0];
  return new RegExp(`\\b${inst.symbol.toLowerCase()}\\b`).test(q) || (first.length > 3 && q.includes(first)) || /\b(this|it)\b/.test(q);
}

function explainInstrument(inst: NonNullable<CoachContext["instrument"]>, risksOnly: boolean): string {
  const sectorPhrase = (sector: string) =>
    !sector || sector === "Crypto" ? "" : sector === "Diversified" ? "spread across many sectors" : /bond/i.test(sector) ? "that holds bonds" : sector === "Precious Metals" ? "that tracks precious metals" : `in the ${sector.toLowerCase()} sector`;
  const regionPhrase = (region: string) =>
    region === "Global" ? "with global exposure" : region === "Emerging" ? "focused on emerging markets" : `focused on the ${region}`;
  const kind = inst.type === "etf" ? "an exchange-traded fund (ETF)" : inst.type === "crypto" ? "a cryptocurrency" : `a ${inst.region === "UK" ? "UK" : "US"}-listed share`;
  const vol = inst.dailyVolPct;
  const volWord = vol >= 3 ? "very volatile" : vol >= 1.8 ? "fairly volatile" : vol >= 0.8 ? "moderately volatile" : "relatively steady";
  const risks: string[] = [];
  if (inst.type === "crypto") risks.push("**Big swings** — crypto can fall 50% or more, and it pays no income.");
  else if (inst.type === "etf") risks.push(`**Market risk** — a fund spreads company risk, but it still falls when its whole market falls.`);
  else risks.push("**Single-company risk** — one bad set of results can knock the price hard. Spreading across many holdings softens this.");
  risks.push(`**Day-to-day moves** — it's ${volWord}, moving about ${vol.toFixed(1)}% on a typical day.`);
  if (inst.currency === "USD") risks.push("**Currency** — it's priced in dollars, so a stronger pound lowers its value to you, and there's an FX fee to trade.");
  if (inst.sector === "Technology" || inst.sector === "Crypto") risks.push("**Concentration** — if you already own big tech or crypto through funds, this adds to the same bet.");
  if (risksOnly) {
    return [`The main risks with **${inst.name} (${inst.symbol})**:`, "", ...risks.map((r) => `- ${r}`), "", `Size it so a bad outcome doesn't hurt — see ${lessonLink("position-sizing")}.`, "", DISCLAIMER].join("\n");
  }
  const facts = [
    `- **What it is:** ${[[kind, sectorPhrase(inst.sector)].filter(Boolean).join(" "), inst.type === "stock" ? "" : regionPhrase(inst.region)].filter(Boolean).join(", ")}.`,
    inst.dividendYieldPct > 0 ? `- **Income:** pays about ${inst.dividendYieldPct}% a year in dividends.` : "- **Income:** no dividend — any return comes from the price.",
    inst.ocfPct != null ? `- **Cost:** ${inst.ocfPct.toFixed(2)}% a year ongoing charge.` : "",
    `- **Today:** ${pct(inst.dayChangePct)}, and ${pct(inst.trend30Pct)} over 30 days. It's ${volWord}.`,
  ].filter(Boolean);
  const lesson = inst.type === "etf" ? lessonLink("what-is-an-etf") : inst.type === "crypto" ? lessonLink("risk-and-return") : lessonLink("what-is-a-share");
  return [`**${inst.name} (${inst.symbol})** in plain English: ${inst.description}`, "", ...facts, "", `**Main risk:** ${risks[0].replace(/\*\*/g, "")}`, "", `New to this? Start with ${lesson}.`, "", DISCLAIMER].join("\n");
}

export function offlineDigest(d: DigestInput): Digest {
  const up = d.dayChangePct >= 0;
  const big = Math.abs(d.dayChangePct) >= Math.max(1.5, d.dailyVolPct * 1.2);
  const headline = big
    ? `${d.name} ${up ? "jumps" : "slides"} ${Math.abs(d.dayChangePct).toFixed(1)}% — a bigger move than usual`
    : `${d.name} ${up ? "edges up" : "dips"} ${Math.abs(d.dayChangePct).toFixed(1)}% in a typical session`;
  const bullets: string[] = [];
  bullets.push(
    d.trend30Pct >= 5
      ? `It's up ${d.trend30Pct.toFixed(1)}% over 30 days, so today sits inside an uptrend.`
      : d.trend30Pct <= -5
        ? `It's down ${Math.abs(d.trend30Pct).toFixed(1)}% over 30 days — today's move is against a downtrend.`
        : `Over 30 days it's roughly flat (${pct(d.trend30Pct)}), trading in a range.`,
  );
  bullets.push(
    d.rsi >= 70
      ? `RSI is ${Math.round(d.rsi)} — overbought territory, where pullbacks are common.`
      : d.rsi <= 30
        ? `RSI is ${Math.round(d.rsi)} — oversold, where bounces often start (but aren't guaranteed).`
        : `Momentum is neutral (RSI ${Math.round(d.rsi)}).`,
  );
  if (d.catalyst) bullets.push(d.catalyst);
  else if (d.headlines[0]) bullets.push(`In the news: ${d.headlines[0]}`);
  else bullets.push(`${d.sentimentLongPct}% of clients are long, ${d.sentimentLongPct >= 65 ? "so the trade is crowded on the buy side" : d.sentimentLongPct <= 35 ? "so many are betting on falls" : "a fairly even split"}.`);
  const takeaway = big
    ? `Moves this size often follow news or results. Check the calendar and headlines before acting — and remember a typical day for ${d.symbol} is about ${d.dailyVolPct.toFixed(1)}%.`
    : `Nothing unusual: ${d.symbol} typically moves about ${d.dailyVolPct.toFixed(1)}% a day. Long-term investors usually ignore days like this.`;
  return { source: "offline", headline, bullets, takeaway };
}
