import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.send("API running"));

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Postgres connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Postgres connection failed:", err);
    process.exit(1);
  }
}

app.get("/admins", async (_req, res) => {
  const result = await pool.query("SELECT id, email, role, created_at FROM admins ORDER BY id ASC");
  res.json(result.rows);
});


start();
