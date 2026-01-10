import express from "express";
import { pool, testConnection } from "./db.js";
import { EventSchema } from "@switchboard/shared";
import { subscribe, unsubscribe, publish } from "./pubsub.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", async (_req, res) => {
  const dbConnected = await testConnection();
  if (dbConnected) {
    res.status(200).json({ status: "ok", database: "connected" });
  } else {
    res.status(503).json({ status: "error", database: "unreachable", message: "Database connection failed" });
  }
});

app.post("/feeds", async (req, res) => {
  const { name, policy_json } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required and must be a string" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO feeds (name, policy_json) VALUES ($1, $2) RETURNING id, name, policy_json, created_at`,
      [name, policy_json ?? null]
    );
    const feed = result.rows[0];
    res.status(201).json(feed);
  } catch (error) {
    console.error("Failed to create feed:", error);
    res.status(500).json({ error: "Failed to create feed" });
  }
});

app.get("/feeds/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, policy_json, created_at FROM feeds WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Feed not found" });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to get feed:", error);
    res.status(500).json({ error: "Failed to get feed" });
  }
});

app.get("/feeds/:id/stream", async (req, res) => {
  const { id } = req.params;

  try {
    const feedResult = await pool.query(
      `SELECT id FROM feeds WHERE id = $1`,
      [id]
    );

    if (feedResult.rows.length === 0) {
      res.status(404).json({ error: "Feed not found" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const onEvent = (event: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    subscribe(id, onEvent);

    req.on("close", () => {
      unsubscribe(id, onEvent);
      res.end();
    });
  } catch (error) {
    console.error("Failed to setup SSE stream:", error);
    res.status(500).json({ error: "Failed to setup stream" });
  }
});

app.post("/feeds/:id/events", async (req, res) => {
  const { id } = req.params;

  const feedResult = await pool.query(
    `SELECT id FROM feeds WHERE id = $1`,
    [id]
  );

  if (feedResult.rows.length === 0) {
    res.status(404).json({ error: "Feed not found" });
    return;
  }

  const parsed = EventSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const event = parsed.data;

  if (event.feed_id !== id) {
    res.status(400).json({ error: "feed_id in body must match URL parameter" });
    return;
  }

  try {
    const existingById = await pool.query(
      `SELECT id, feed_id, type, author_identity_id, source_platform, source_adapter_id, source_msg_id, ts, payload_json, refs_json
       FROM events WHERE id = $1`,
      [event.event_id]
    );

    if (existingById.rows.length > 0) {
      const row = existingById.rows[0];
      res.status(200).json({
        event_id: row.id,
        feed_id: row.feed_id,
        type: row.type,
        author_identity_id: row.author_identity_id,
        source: {
          platform: row.source_platform,
          adapter_id: row.source_adapter_id,
          source_msg_id: row.source_msg_id
        },
        ts: row.ts.toISOString(),
        payload: row.payload_json,
        refs: row.refs_json
      });
      return;
    }

    if (event.source.source_msg_id !== null) {
      const existingBySource = await pool.query(
        `SELECT id, feed_id, type, author_identity_id, source_platform, source_adapter_id, source_msg_id, ts, payload_json, refs_json
         FROM events WHERE source_platform = $1 AND source_msg_id = $2`,
        [event.source.platform, event.source.source_msg_id]
      );

      if (existingBySource.rows.length > 0) {
        const row = existingBySource.rows[0];
        res.status(200).json({
          event_id: row.id,
          feed_id: row.feed_id,
          type: row.type,
          author_identity_id: row.author_identity_id,
          source: {
            platform: row.source_platform,
            adapter_id: row.source_adapter_id,
            source_msg_id: row.source_msg_id
          },
          ts: row.ts.toISOString(),
          payload: row.payload_json,
          refs: row.refs_json
        });
        return;
      }
    }

    const result = await pool.query(
      `INSERT INTO events (id, feed_id, type, author_identity_id, source_platform, source_adapter_id, source_msg_id, ts, payload_json, refs_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, feed_id, type, author_identity_id, source_platform, source_adapter_id, source_msg_id, ts, payload_json, refs_json`,
      [
        event.event_id,
        event.feed_id,
        event.type,
        event.author_identity_id,
        event.source.platform,
        event.source.adapter_id,
        event.source.source_msg_id,
        event.ts,
        event.payload,
        event.refs ?? null
      ]
    );

    const row = result.rows[0];
    const storedEvent = {
      event_id: row.id,
      feed_id: row.feed_id,
      type: row.type,
      author_identity_id: row.author_identity_id,
      source: {
        platform: row.source_platform,
        adapter_id: row.source_adapter_id,
        source_msg_id: row.source_msg_id
      },
      ts: row.ts.toISOString(),
      payload: row.payload_json,
      refs: row.refs_json
    };

    publish(id, storedEvent);

    res.status(201).json(storedEvent);
  } catch (error) {
    console.error("Failed to ingest event:", error);
    res.status(500).json({ error: "Failed to ingest event" });
  }
});

app.listen(PORT, () => {
  console.log(`relay-api listening on port ${PORT}`);
});

export { app };
