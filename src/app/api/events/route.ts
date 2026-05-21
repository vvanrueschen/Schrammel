import { NextRequest } from "next/server";
import { addListener, removeListener } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const listener = () => send("update");

      send(": connected");

      const pingInterval = setInterval(() => send(": ping"), 25000);

      addListener(listener);

      request.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        removeListener(listener);
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
