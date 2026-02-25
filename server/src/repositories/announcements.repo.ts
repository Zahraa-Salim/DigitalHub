// File Summary: server/src/repositories/announcements.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function createAnnouncement(input, db = pool) {
    return db.query(`
      INSERT INTO announcements
        (title, body, target_audience, cohort_id, is_auto, is_published, publish_at, created_by, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [
        input.title,
        input.body,
        input.target_audience,
        input.cohort_id ?? null,
        input.is_auto,
        input.is_published,
        input.publish_at ?? null,
        input.created_by,
    ]);
}
export async function countAnnouncements(whereClause, params, db = pool) {
    const scopedWhere = whereClause ? `${whereClause} AND deleted_at IS NULL` : "WHERE deleted_at IS NULL";
    return db.query(`SELECT COUNT(*)::int AS total FROM announcements ${scopedWhere}`, params);
}
export async function listAnnouncements(whereClause, sortBy, order, params, limit, offset, db = pool) {
    const scopedWhere = whereClause ? `${whereClause} AND deleted_at IS NULL` : "WHERE deleted_at IS NULL";
    return db.query(`
      SELECT *
      FROM announcements
      ${scopedWhere}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function updateAnnouncement(id, setClause, values, db = pool) {
    return db.query(`
      UPDATE announcements
      SET ${setClause}
      WHERE id = $${values.length + 1}
        AND deleted_at IS NULL
      RETURNING *
    `, [...values, id]);
}
export async function deleteAnnouncement(id, db = pool) {
    return db.query(`
      UPDATE announcements
      SET deleted_at = NOW(), is_published = FALSE
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
    `, [id]);
}


