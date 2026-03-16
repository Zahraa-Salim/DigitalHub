// File: server/src/repositories/logs.repo.ts
// Purpose: Runs the database queries used for logs.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";
// Handles 'countLogs' workflow for this module.
export async function countLogs(whereClause: string, params: unknown[], db: DbClient = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM activity_logs ${whereClause}`, params);
}
// Handles 'listLogs' workflow for this module.
export async function listLogs(
    whereClause: string,
    sortBy: string,
    order: string,
    params: unknown[],
    limit: number,
    offset: number,
    db: DbClient = pool,
) {
    return db.query(`
      SELECT *
      FROM activity_logs
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}

