import { config } from "../config.js";
import type { RelayEvent } from "./types.js";

export async function postEvent(event: RelayEvent): Promise<void> {
  const res = await fetch(`${config.relayBaseUrl}/v1/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Relay POST /v1/events failed: ${res.status} ${text}`);
  }
}

