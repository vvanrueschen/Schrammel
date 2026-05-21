import { useEffect, useRef } from "react";

export function useSSE(onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("update", () => {
      onUpdateRef.current();
    });

    eventSource.onerror = () => {
      eventSource.close();
      setTimeout(() => {
        const retry = new EventSource("/api/events");
        retry.addEventListener("update", () => {
          onUpdateRef.current();
        });
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, []);
}
