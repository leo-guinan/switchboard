import express from "express";
import { pool, testConnection } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.listen(PORT, () => {
  console.log(`relay-api listening on port ${PORT}`);
});

export { app };
