// File: server/src/repositories/events.repo.ts
// Purpose: Runs the database queries used for events.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type EventInput = {
    slug?: string;
    title?: string;
    description?: string | null;
    post_body?: string | null;
    location?: string | null;
    starts_at?: string;
    ends_at?: string | null;
    is_published?: boolean;
    auto_announce?: boolean;
    completion_image_urls?: string[];
    created_by?: number | null;
};
// Handles 'createEvent' workflow for this module.
export async function createEvent(input: EventInput, db: DbClient = pool) {
    return db.query(`
      INSERT INTO events
        (slug, title, description, post_body, location, starts_at, ends_at, is_published, is_done, auto_announce, completion_image_urls, created_by, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $10::jsonb, $11, NOW(), NOW())
      RETURNING *
    `, [
        input.slug,
        input.title,
        input.description ?? null,
        input.post_body ?? null,
        input.location ?? null,
        input.starts_at,
        input.ends_at ?? null,
        input.is_published,
        input.auto_announce ?? false,
        JSON.stringify(input.completion_image_urls ?? []),
        input.created_by,
    ]);
}
// Handles 'countEvents' workflow for this module.
export async function countEvents(whereClause: string, params: unknown[], db: DbClient = pool) {
    const scopedWhere = whereClause ? `${whereClause} AND deleted_at IS NULL` : "WHERE deleted_at IS NULL";
    return db.query(`SELECT COUNT(*)::int AS total FROM events ${scopedWhere}`, params);
}
// Handles 'listEvents' workflow for this module.
export async function listEvents(
    whereClause: string,
    sortBy: string,
    order: string,
    params: unknown[],
    limit: number,
    offset: number,
    db: DbClient = pool,
) {
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
// Handles 'updateEvent' workflow for this module.
export async function updateEvent(id: number, setClause: string, values: unknown[], db: DbClient = pool) {
    return db.query(`
      UPDATE events
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
        AND deleted_at IS NULL
      RETURNING *
    `, [...values, id]);
}
// Handles 'deleteEvent' workflow for this module.
export async function deleteEvent(id: number, db: DbClient = pool) {
    return db.query(`
      UPDATE events
      SET deleted_at = NOW(), updated_at = NOW(), is_published = FALSE
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
    `, [id]);
}
// Handles 'markEventDone' workflow for this module.
export async function markEventDone(id: number, db: DbClient = pool) {
    return db.query(`
      UPDATE events
      SET is_done = TRUE, done_at = NOW(), updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
    `, [id]);
}

