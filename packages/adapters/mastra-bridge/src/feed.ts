import { TextDecoder } from "util";
import type { Event } from "@switchboard/shared";

function normalizeUrl(relayUrl: string): string {
  return relayUrl.replace(/\/+$/, "");
}

export type FeedEventHandler = (event: Event) => Promise<void>;

export interface FeedSubscriber {
  subscribe(handler: FeedEventHandler): Promise<() => void>;
}

export function createFeedSubscriber(
  relayUrl: string,
  feedId: string
): FeedSubscriber {
  const streamUrl = `${normalizeUrl(relayUrl)}/feeds/${feedId}/stream`;

  return {
    async subscribe(handler: FeedEventHandler) {
      let retryMs = 1000;
      let shouldStop = false;
      const controller = new AbortController();

      const readerLoop = async () => {
        while (!shouldStop) {
          try {
            const res = await fetch(streamUrl, {
              headers: { Accept: "text/event-stream" },
              signal: controller.signal,
            });

            if (!res.ok || !res.body) {
              throw new Error(`SSE bad response: ${res.status}`);
            }

            retryMs = 1000;
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";

            while (!shouldStop) {
              const { value, done } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });

              const parts = buf.split("\n\n");
              buf = parts.pop() ?? "";

              for (const chunk of parts) {
                if (!chunk.trim()) continue;
                const lines = chunk.split("\n");
                const dataLines = lines
                  .filter((line) => line.startsWith("data:"))
                  .map((line) => line.slice(5).trim());
                if (!dataLines.length) continue;

                const event = JSON.parse(dataLines.join("\n")) as Event;
                await handler(event);
              }
            }
          } catch (error) {
            if (controller.signal.aborted || shouldStop) {
              break;
            }

            await new Promise((resolve) => setTimeout(resolve, retryMs));
            retryMs = Math.min(30000, Math.floor(retryMs * 1.7));
          }
        }
      };

      readerLoop();

      return () => {
        shouldStop = true;
        controller.abort();
      };
    },
  };
}

