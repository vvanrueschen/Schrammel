type EventCallback = () => void;

const listeners = new Set<EventCallback>();

export function broadcastUpdate() {
  listeners.forEach((cb) => cb());
}

export function addListener(cb: EventCallback) {
  listeners.add(cb);
}

export function removeListener(cb: EventCallback) {
  listeners.delete(cb);
}
