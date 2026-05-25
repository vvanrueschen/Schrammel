type EventCallback = (data: string) => void;

const listeners = new Set<EventCallback>();

export function broadcastUpdate(data = "") {
  listeners.forEach((cb) => cb(data));
}

export function addListener(cb: EventCallback) {
  listeners.add(cb);
}

export function removeListener(cb: EventCallback) {
  listeners.delete(cb);
}