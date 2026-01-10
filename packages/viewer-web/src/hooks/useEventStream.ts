import { useState, useEffect, useRef, useCallback } from "react";

export interface EventData {
  event_id: string;
  feed_id: string;
  type: string;
  author_identity_id: string;
  ts: string;
  source: {
    platform: string;
    adapter_id: string;
    source_msg_id: string | null;
  };
  payload: Record<string, unknown>;
}

interface UseEventStreamResult {
  events: EventData[];
  isConnected: boolean;
  error: string | null;
}

const MAX_EVENTS = 100;

export function useEventStream(feedId: string | null): UseEventStreamResult {
  const [events, setEvents] = useState<EventData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!feedId) {
      cleanup();
      setEvents([]);
      setIsConnected(false);
      setError(null);
      return;
    }

    cleanup();
    setEvents([]);
    setError(null);

    const streamUrl = `/api/feeds/${feedId}/stream`;

    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData: EventData = JSON.parse(event.data);
        setEvents((prev) => {
          const updated = [eventData, ...prev];
          return updated.slice(0, MAX_EVENTS);
        });
      } catch {
        console.error("Failed to parse event data:", event.data);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError("Connection lost");
    };

    return cleanup;
  }, [feedId, cleanup]);

  return { events, isConnected, error };
}
