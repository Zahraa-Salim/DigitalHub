// File Summary: server/src/repositories/logs.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
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


