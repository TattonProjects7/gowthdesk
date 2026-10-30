import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, streamCoach } from "@/lib/ai/claude";
import { offlineCoach } from "@/lib/ai/offline";
import { clientKey, rateLimited } from "@/lib/ai/ratelimit";
import type { ChatMessage, CoachContext } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The AI coach. Streams plain text. Uses Claude when ANTHROPIC_API_KEY is set,
// otherwise (or if the API fails before answering) the offline coach — the
// X-Coach-Source header says which answered.
export async function POST(req: Request) {
  let body: { messages?: ChatMessage[]; context?: CoachContext };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const context: CoachContext = body.context ?? { page: "/", experience: null, lessonsDone: 0, level: "Curious" };
  if (!messages.length) return new Response("No message", { status: 400 });

  const useAi = aiConfigured() && !rateLimited(`coach:${clientKey(req)}`, 30, 10 * 60_000);
  const encoder = new TextEncoder();

  if (!useAi) {
    const text = offlineCoach(messages, context);
    return new Response(chunked(text, encoder), { headers: headers("offline") });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sent = false;
      try {
        for await (const chunk of streamCoach(messages, context)) {
          sent = true;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) console.warn("coach: rate limited by API");
        else if (err instanceof Anthropic.AuthenticationError) console.error("coach: invalid ANTHROPIC_API_KEY");
        else if (err instanceof Anthropic.APIError) console.error(`coach: API error ${err.status}`);
        else console.error("coach: unexpected error", err);
        // Nothing streamed yet → answer offline instead of failing.
        if (!sent) controller.enqueue(encoder.encode(offlineCoach(messages, context)));
        else controller.enqueue(encoder.encode("\n\n_(Connection to the coach dropped — try asking again.)_"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: headers("ai") });
}

function headers(source: "ai" | "offline"): HeadersInit {
  return { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Coach-Source": source };
}

// Stream the offline answer word by word so it feels like the AI version.
function chunked(text: string, encoder: TextEncoder): ReadableStream<Uint8Array> {
  const parts = text.match(/\S+\s*/g) ?? [text];
  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < parts.length; i += 3) {
        controller.enqueue(encoder.encode(parts.slice(i, i + 3).join("")));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.close();
    },
  });
}
