import { useEffect, useRef } from "react";

export function useSSE(onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      es = new EventSource("/api/events");

      es.addEventListener("update", () => {
        onUpdateRef.current();
      });

      es.onerror = () => {
        es?.close();
        es = null;
        retryTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, []);
}