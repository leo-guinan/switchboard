import { randomUUID } from "node:crypto";

function normalizeUrl(relayUrl: string): string {
  return relayUrl.replace(/\/+$/, "");
}

export type LogLevel = "info" | "warn" | "error";

export interface LogPublisher {
  publish(level: LogLevel, message: string, context?: Record<string, unknown>): Promise<void>;
}

export function createLogPublisher(
  relayUrl: string,
  feedId?: string
): LogPublisher | undefined {
  if (!feedId) return undefined;

  const endpoint = `${normalizeUrl(relayUrl)}/feeds/${feedId}/events`;

  return {
    async publish(level, message, context = {}) {
      const event = {
        event_id: randomUUID(),
        feed_id: feedId,
        type: "log",
        author_identity_id: "mastra:bridge",
        source: {
          platform: "mastra",
          adapter_id: "mastra-bridge",
          source_msg_id: null,
        },
        ts: new Date().toISOString(),
        payload: {
          level,
          message,
          context,
        },
        refs: {},
      };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(event),
        });

        if (!res.ok) {
          console.warn(
            `[mastra-bridge][log dump] failed ${res.status}: ${await res.text()}`
          );
        }
      } catch (err) {
        console.warn("[mastra-bridge][log dump] failed to publish event", err);
      }
    },
  };
}

