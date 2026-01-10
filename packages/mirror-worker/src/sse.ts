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

export function connectToFeed(
  relayUrl: string,
  feedId: string,
  onEvent: (event: FeedEvent) => void
): EventSource {
  const url = `${relayUrl}/feeds/${feedId}/stream`;
  const es = new EventSource(url);

  es.onopen = () => {
    console.log(`[SSE] Connected to feed ${feedId} at ${url}`);
  };

  es.onmessage = (messageEvent) => {
    try {
      const parsed = JSON.parse(messageEvent.data) as FeedEvent;
      onEvent(parsed);
    } catch (err) {
      console.error(`[SSE] Failed to parse event for feed ${feedId}:`, err);
    }
  };

  es.onerror = (err) => {
    console.error(`[SSE] Error on feed ${feedId}:`, err);
  };

  return es;
}
