// File: server/db/index.js
// Purpose: Contains backend code for index.
// It supports this part of the server feature set.

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
  ssl: sslEnabled ? { rejectUnauthorized: false, sslmode: 'verify-full' } : undefined,
});

// Handles 'withTransaction' workflow for this module.
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

