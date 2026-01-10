import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { randomUUID } from "crypto";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function fetch(path: string, options: { method?: string; body?: object; headers?: Record<string, string> } = {}) {
  const url = new URL(path, BASE_URL);
  const response = await globalThis.fetch(url.toString(), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return response;
}

describe("Integration: Full ingest-to-SSE flow", () => {
  let feedId: string;
  let feedName: string;

  beforeAll(async () => {
    const healthRes = await fetch("/health");
    if (healthRes.status !== 200) {
      throw new Error("Server not healthy. Make sure docker compose is running.");
    }
  });

  it("creates a feed via POST /feeds", async () => {
    feedName = `test-feed-${Date.now()}`;
    const res = await fetch("/feeds", {
      method: "POST",
      body: { name: feedName },
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe(feedName);
    expect(data.id).toBeDefined();
    expect(data.created_at).toBeDefined();
    
    feedId = data.id;
  });

  it("receives event via SSE within 1 second after POSTing", async () => {
    const eventId = randomUUID();
    const eventTs = new Date().toISOString();
    
    const eventPayload = {
      event_id: eventId,
      feed_id: feedId,
      type: "test.event",
      author_identity_id: "test-author-123",
      source: {
        platform: "test-platform",
        adapter_id: "test-adapter",
        source_msg_id: null,
      },
      ts: eventTs,
      payload: { message: "Hello, SSE!" },
    };

    const sseReceivedPromise = new Promise<object>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("SSE did not receive event within 1 second"));
      }, 1000);

      const url = new URL(`/feeds/${feedId}/stream`, BASE_URL);
      
      http.get(url.toString(), (res) => {
        res.setEncoding("utf8");
        
        res.on("data", (chunk: string) => {
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              try {
                const event = JSON.parse(jsonStr);
                if (event.event_id === eventId) {
                  clearTimeout(timeoutId);
                  res.destroy();
                  resolve(event);
                }
              } catch {
                // Ignore parse errors for partial chunks
              }
            }
          }
        });

        res.on("error", (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      }).on("error", (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });

    await new Promise((r) => setTimeout(r, 100));

    const postRes = await fetch(`/feeds/${feedId}/events`, {
      method: "POST",
      body: eventPayload,
    });

    expect(postRes.status).toBe(201);
    const postedEvent = await postRes.json();
    expect(postedEvent.event_id).toBe(eventId);

    const sseEvent = await sseReceivedPromise;
    expect(sseEvent).toMatchObject({
      event_id: eventId,
      feed_id: feedId,
      type: "test.event",
      author_identity_id: "test-author-123",
      payload: { message: "Hello, SSE!" },
    });
  });

  it("verifies GET /feeds/:id/events returns the persisted event", async () => {
    const res = await fetch(`/feeds/${feedId}/events`);
    
    expect(res.status).toBe(200);
    const events = await res.json();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    
    const testEvent = events.find((e: { type: string }) => e.type === "test.event");
    expect(testEvent).toBeDefined();
    expect(testEvent.feed_id).toBe(feedId);
    expect(testEvent.payload).toEqual({ message: "Hello, SSE!" });
  });
});
