// File Summary: server/src/repositories/events.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function createEvent(input, db = pool) {
    return db.query(`
      INSERT INTO events
        (slug, title, description, location, starts_at, ends_at, is_published, is_done, created_by, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, NOW(), NOW())
      RETURNING *
    `, [
        input.slug,
        input.title,
        input.description ?? null,
        input.location ?? null,
        input.starts_at,
        input.ends_at ?? null,
        input.is_published,
        input.created_by,
    ]);
}
export async function countEvents(whereClause, params, db = pool) {
    const scopedWhere = whereClause ? `${whereClause} AND deleted_at IS NULL` : "WHERE deleted_at IS NULL";
    return db.query(`SELECT COUNT(*)::int AS total FROM events ${scopedWhere}`, params);
}
export async function listEvents(whereClause, sortBy, order, params, limit, offset, db = pool) {
    const scopedWhere = whereClause ? `${whereClause} AND deleted_at IS NULL` : "WHERE deleted_at IS NULL";
    return db.query(`
      SELECT *
      FROM events
      ${scopedWhere}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function updateEvent(id, setClause, values, db = pool) {
    return db.query(`
      UPDATE events
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
        AND deleted_at IS NULL
      RETURNING *
    `, [...values, id]);
}
export async function deleteEvent(id, db = pool) {
    return db.query(`
      UPDATE events
      SET deleted_at = NOW(), updated_at = NOW(), is_published = FALSE
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
    `, [id]);
}
export async function markEventDone(id, db = pool) {
    return db.query(`
      UPDATE events
      SET is_done = TRUE, done_at = NOW(), updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
    `, [id]);
}


