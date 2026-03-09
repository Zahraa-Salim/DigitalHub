// File: server/src/repositories/logs.repo.ts
// What this code does:
// 1) Implements module-specific behavior for this code unit.
// 2) Coordinates inputs, internal processing, and outputs.
// 3) Uses shared utilities to keep logic consistent and reusable.
// 4) Exports functions/components used by other project modules.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function countLogs(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM activity_logs ${whereClause}`, params);
}
export async function listLogs(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT *
      FROM activity_logs
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}


