import { NextRequest } from "next/server";
import { getNowPlayingCache } from "@/lib/now-playing-poller";
import { addListener, removeListener } from "@/lib/events";

export const dynamic = "force-dynamic";

const SSE_UPDATE_INTERVAL = 5000;

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          // Stream already closed
        }
      };

      send("comment", "connected");

      let lastKey = "";

      const checkInterval = setInterval(() => {
        const cached = getNowPlayingCache();
        if (cached) {
          const key = `${cached.artist}|${cached.title}|${cached.azuracastId}`;
          if (key !== lastKey) {
            lastKey = key;
            send("now-playing", JSON.stringify({
              artist: cached.artist,
              title: cached.title,
              azuracastId: cached.azuracastId,
            }));
          }
        }
      }, SSE_UPDATE_INTERVAL);

      const pingInterval = setInterval(() => send("ping", "ping"), 25000);

      const onVote = () => send("refresh", "");

      addListener(onVote);

      request.signal.addEventListener("abort", () => {
        clearInterval(checkInterval);
        clearInterval(pingInterval);
        removeListener(onVote);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}