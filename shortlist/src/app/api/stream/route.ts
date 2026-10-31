import { hub } from "@/lib/live/hub";
import { isInstrument } from "@/lib/instruments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 60 seconds is the longest every Vercel plan allows; a longer value fails the
// whole deployment on plans that cap it.
export const maxDuration = 60;

// Real-time prices as Server-Sent Events. The browser opens one stream and
// gets `ticks` (changed prices, coalesced) and `status` (which feeds are up).
// `?focus=AAPL,TSLA` names what the viewer is looking at, so those get the
// limited US streaming slots first.
//
// Each response ends shortly before the platform's time limit (every 45
// seconds) with a `bye` event; EventSource reconnects by itself and gets the
// latest prices straight away, so the viewer never notices.

const enc = new TextEncoder();

export async function GET(req: Request) {
  const focus = (new URL(req.url).searchParams.get("focus") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s && isInstrument(s))
    .slice(0, 20);

  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const write = (s: string) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          cleanup();
        }
      };
      write("retry: 2000\n\n");
      const leave = hub.join((event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`), focus);
      const ping = setInterval(() => write(": ping\n\n"), 15_000);
      const end = setTimeout(() => {
        write("event: bye\ndata: {}\n\n");
        cleanup();
      }, (maxDuration - 15) * 1000);
      cleanup = () => {
        if (!open) return;
        open = false;
        clearInterval(ping);
        clearTimeout(end);
        leave();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
