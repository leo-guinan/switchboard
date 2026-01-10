import { EventEmitter } from "events";

type EventData = Record<string, unknown>;
type Subscriber = (event: EventData) => void;

const emitter = new EventEmitter();

const subscribers = new Map<string, Set<Subscriber>>();

export function subscribe(feedId: string, callback: Subscriber): void {
  if (!subscribers.has(feedId)) {
    subscribers.set(feedId, new Set());
  }
  subscribers.get(feedId)!.add(callback);

  emitter.on(feedId, callback);
}

export function unsubscribe(feedId: string, callback: Subscriber): void {
  const feedSubscribers = subscribers.get(feedId);
  if (feedSubscribers) {
    feedSubscribers.delete(callback);
    if (feedSubscribers.size === 0) {
      subscribers.delete(feedId);
    }
  }

  emitter.off(feedId, callback);
}

export function publish(feedId: string, event: EventData): void {
  emitter.emit(feedId, event);
}
