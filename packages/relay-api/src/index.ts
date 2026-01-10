import express from "express";
import { pool, testConnection } from "./db.js";

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

app.listen(PORT, () => {
  console.log(`relay-api listening on port ${PORT}`);
});

export { app };
