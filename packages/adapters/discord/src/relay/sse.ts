import { config } from "../config.js";
import type { RelayEvent } from "./types.js";

export type SSEHandler = (event: RelayEvent) => Promise<void>;

export async function subscribeToFeedStream(onEvent: SSEHandler): Promise<void> {
  const url = `${config.relayBaseUrl}/v1/feeds/${config.feedId}/stream`;
  let retryMs = 1000;

  while (true) {
    try {
      const res = await fetch(url, {
        headers: { accept: "text/event-stream" },
      });
      if (!res.ok || !res.body) {
        throw new Error(`SSE bad response: ${res.status}`);
      }

      retryMs = 1000;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const chunk of parts) {
          const lines = chunk.split("\n");
          const dataLines = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim());
          if (dataLines.length === 0) continue;
          const dataStr = dataLines.join("\n");
          const evt = JSON.parse(dataStr) as RelayEvent;
          await onEvent(evt);
        }
      }
    } catch (err) {
      // backoff
      await new Promise((resolve) => setTimeout(resolve, retryMs));
      retryMs = Math.min(30000, Math.floor(retryMs * 1.7));
    }
  }
}

