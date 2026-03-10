// File: server/src/repositories/logs.repo.ts
// Purpose: Runs the database queries used for logs.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

// @ts-nocheck

import { pool } from "../db/index.js";
// Handles 'countLogs' workflow for this module.
export async function countLogs(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM activity_logs ${whereClause}`, params);
}
// Handles 'listLogs' workflow for this module.
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

