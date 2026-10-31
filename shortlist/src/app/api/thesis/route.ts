import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Shape the client posts (the candidate essentials) and we reason over.
interface ThesisRequest {
  symbol: string;
  name: string;
  score: number;
  reasons: { label: string; detail: string; weight: number }[];
  squeeze: { level: string; shortInterestPctFloat: number; daysToCover: number; borrowFeePct: number; verdict: string };
  structure: { entry: number; stop: number; target: number; maxLoss: number; maxGain: number; rewardRisk: number; stopPct: number; targetPct: number };
  signals: { rsi: number; zscore: number; trend30: number; belowShortMa: boolean };
}

export interface ThesisResponse {
  source: "ai" | "heuristic";
  bear: { summary: string; points: string[] };
  bull: { summary: string; points: string[] }; // the steel-man: why the short could fail
  riskNote: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as ThesisRequest;

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const ai = await aiThesis(body, key);
      if (ai) return NextResponse.json(ai);
    } catch {
      /* fall through to heuristic */
    }
  }
  return NextResponse.json(heuristicThesis(body));
}

// --- Optional AI pass (OpenAI SDK, already a dependency) ---------------------
async function aiThesis(b: ThesisRequest, key: string): Promise<ThesisResponse | null> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: key });

  const prompt = `You are a disciplined short-selling analyst. Given the setup below, write BOTH a bear case (why the short works) and a steel-manned bull case (the strongest reasons the short could fail — this fights confirmation bias). Be specific and concise.

Stock: ${b.symbol} (${b.name})
Short score: ${b.score}/100
Signals: RSI ${b.signals.rsi.toFixed(0)}, ${b.signals.zscore.toFixed(1)}σ vs mean, 30d trend ${b.signals.trend30.toFixed(1)}%, ${b.signals.belowShortMa ? "below" : "above"} short MA
Squeeze risk: ${b.squeeze.level} (${b.squeeze.shortInterestPctFloat}% of float short, ${b.squeeze.daysToCover} days to cover, ${b.squeeze.borrowFeePct}% borrow fee)
Trade: short at ${b.structure.entry}, stop ${b.structure.stop}, target ${b.structure.target}, reward:risk ${b.structure.rewardRisk}:1
Reasons flagged: ${b.reasons.map((r) => r.label).join(", ")}

Respond as JSON: {"bear":{"summary":string,"points":string[3-4]},"bull":{"summary":string,"points":string[3-4]},"riskNote":string}`;

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });
  const text = resp.choices[0]?.message?.content;
  if (!text) return null;
  const parsed = JSON.parse(text) as Omit<ThesisResponse, "source">;
  return { source: "ai", ...parsed };
}

// --- Deterministic fallback — readable, specific, zero-config ----------------
function heuristicThesis(b: ThesisRequest): ThesisResponse {
  const bearPoints: string[] = [];
  for (const r of b.reasons.filter((x) => x.weight > 0).sort((a, c) => c.weight - a.weight)) {
    bearPoints.push(`${r.label}: ${r.detail}`);
  }
  bearPoints.push(
    `Defined risk: short at $${b.structure.entry}, stop $${b.structure.stop} caps the loss at £${b.structure.maxLoss}, target $${b.structure.target} (${(
      b.structure.targetPct * 100
    ).toFixed(0)}% lower) pays £${b.structure.maxGain.toLocaleString()} — ${b.structure.rewardRisk.toFixed(1)}:1.`,
  );

  const bullPoints: string[] = [];
  if (b.squeeze.level === "extreme" || b.squeeze.level === "high") {
    bullPoints.push(
      `Squeeze risk: ${b.squeeze.shortInterestPctFloat}% of float is already short (${b.squeeze.daysToCover} days to cover). A pop could force shorts to cover and rip price against you.`,
    );
  }
  if (!b.signals.belowShortMa) {
    bullPoints.push("Trend intact: price is still above its short-term average — you'd be fighting an uptrend, not riding a breakdown.");
  }
  if (b.signals.rsi < 68) {
    bullPoints.push(`Momentum isn't exhausted yet (RSI ${b.signals.rsi.toFixed(0)}) — buyers may have more to give before any rollover.`);
  }
  bullPoints.push("A positive surprise — earnings beat, upgrade, buyback or sector bid — would invalidate the thesis quickly; that's exactly what the stop is for.");
  bullPoints.push("Structurally, shorting fights equities' long-run upward drift, so the edge has to be timing, and timing is hard.");

  const conviction = b.score >= 70 ? "high-conviction" : b.score >= 50 ? "moderate" : "low-conviction";
  return {
    source: "heuristic",
    bear: {
      summary: `A ${conviction} short: ${b.symbol} looks stretched and is rolling over, with a defined-risk structure paying ${b.structure.rewardRisk.toFixed(
        1,
      )}:1 if the move plays out.`,
      points: bearPoints.slice(0, 5),
    },
    bull: {
      summary: `Before you commit, the strongest case the short FAILS — read this, not just the bear case.`,
      points: bullPoints.slice(0, 4),
    },
    riskNote: b.squeeze.verdict,
  };
}
