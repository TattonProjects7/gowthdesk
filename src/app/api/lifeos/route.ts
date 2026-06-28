import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM = `You are LifeOS — an AI operating system that knows everything about the user's life.
You are their second brain. The user's real data (calendar, bank, bills, health, key dates)
is provided below as live context.

How to answer:
- Be warm, direct and concise — like a sharp personal assistant who knows them well.
- ALWAYS ground your answer in the specific numbers and facts in the context. Quote real
  figures (£ amounts, dates, names) — never give generic advice.
- When it's a money question, actually do the maths: add up the relevant outgoings and
  income, state what's left, then give a clear recommendation.
- If something is genuinely unknown from the context, say so briefly rather than inventing it.
- British spelling and £ for money. Keep it tight: a couple of short paragraphs or a few
  bullets. End with one clear takeaway.`;

export async function POST(req: NextRequest) {
  const { question, context, name } = await req.json();

  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "No question provided" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const ctx = typeof context === "string" && context.trim()
    ? context
    : "No context was provided about the user.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM + (name ? `\nAddress the user as ${name}.` : "") },
      { role: "system", content: `LIVE CONTEXT ABOUT THE USER:\n\n${ctx}` },
      { role: "user", content: question },
    ],
    max_tokens: 700,
    temperature: 0.6,
  });

  return NextResponse.json({ answer: completion.choices[0].message.content });
}
