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

app.listen(PORT, () => {
  console.log(`relay-api listening on port ${PORT}`);
});

export { app };
