// File Summary: server/src/db/index.ts
// Layer: db
// Purpose: Provides PostgreSQL pool setup and transaction helper behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import pkg from "pg";
import dns from "node:dns";
const { Pool } = pkg;
const LEGACY_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);
function normalizeDatabaseUrl(rawUrl: string, forceDisableSsl = false): string {
    if (!rawUrl) {
        return rawUrl;
    }
    try {
        const parsed = new URL(rawUrl);
        if (forceDisableSsl) {
            parsed.searchParams.set("sslmode", "disable");
            return parsed.toString();
        }
        const sslMode = (parsed.searchParams.get("sslmode") || "").trim().toLowerCase();
        const libpqCompat = (parsed.searchParams.get("uselibpqcompat") || "").trim().toLowerCase();
        if (LEGACY_SSL_MODES.has(sslMode) && libpqCompat !== "true") {
            parsed.searchParams.set("sslmode", "verify-full");
        }
        return parsed.toString();
    }
    catch {
        return rawUrl;
    }
}
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore when runtime does not support changing DNS result order.
}

const sslMode = String(process.env.PGSSLMODE || "").trim().toLowerCase();
const databaseUrl = normalizeDatabaseUrl(String(process.env.DATABASE_URL || "").trim(), sslMode === "disable");
const sslRejectUnauthorizedEnv = String(process.env.PGSSL_REJECT_UNAUTHORIZED || "").trim().toLowerCase();
const sslRejectUnauthorized = sslRejectUnauthorizedEnv
    ? ["1", "true", "yes", "on"].includes(sslRejectUnauthorizedEnv)
    : String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
const connectionStringRequestsSsl = (() => {
    if (!databaseUrl) {
        return false;
    }
    try {
        const parsed = new URL(databaseUrl);
        const mode = (parsed.searchParams.get("sslmode") || "").trim().toLowerCase();
        return mode !== "" && mode !== "disable";
    }
    catch {
        return false;
    }
})();
const envRequestsSsl = String(process.env.PGSSL || "").trim().toLowerCase() === "true";
const sslEnabled = sslMode !== "disable" && (envRequestsSsl || connectionStringRequestsSsl);
const sharedPoolOptions = {
    ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : undefined,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 15000),
  keepAlive: true,
};
export const pool = new Pool(databaseUrl
    ? {
        connectionString: databaseUrl,
        ...sharedPoolOptions,
    }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ...sharedPoolOptions,
    });
pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL client error:", error);
});
export async function withTransaction(handler) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await handler(client);
        await client.query("COMMIT");
        return result;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}


