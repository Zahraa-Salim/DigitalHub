// File Summary: server/db/index.js
// Layer: db
// Purpose: Legacy JavaScript DB entry exposing pool and transaction helpers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.

import dotenv from "dotenv";
import pkg from "pg";

const { Pool } = pkg;

dotenv.config();

const sslEnabled = process.env.PGSSL !== "false";

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
});

export async function withTransaction(handler) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
