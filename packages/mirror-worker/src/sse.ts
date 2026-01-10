import EventSource from "eventsource";

export interface FeedEvent {
  event_id: string;
  feed_id: string;
  type: string;
  author_identity_id: string;
  source: {
    platform: string;
    adapter_id: string;
    source_msg_id: string | null;
  };
  ts: string;
  payload: Record<string, unknown>;
  refs?: string[];
}

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

export function connectToFeed(
  relayUrl: string,
  feedId: string,
  onEvent: (event: FeedEvent) => void
): EventSource {
  const url = `${relayUrl}/feeds/${feedId}/stream`;
  let backoffMs = INITIAL_BACKOFF_MS;
  let es: EventSource;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  function connect(): EventSource {
    es = new EventSource(url);

    es.onopen = () => {
      console.log(`[SSE] Connected to feed ${feedId} at ${url}`);
      backoffMs = INITIAL_BACKOFF_MS;
    };

    es.onmessage = (messageEvent) => {
      try {
        const parsed = JSON.parse(messageEvent.data) as FeedEvent;
        onEvent(parsed);
      } catch (err) {
        console.error(`[SSE] Failed to parse event for feed ${feedId}:`, err);
      }
    };

    es.onerror = () => {
      console.log(`[SSE] Connection error on feed ${feedId}, reconnecting in ${backoffMs}ms...`);
      es.close();

      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connect();
      }, backoffMs);

      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    };

    return es;
  }

  return connect();
}
