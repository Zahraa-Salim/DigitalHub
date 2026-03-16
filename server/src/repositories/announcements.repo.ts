// File: server/src/repositories/announcements.repo.ts
// Purpose: Runs the database queries used for announcements.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type AnnouncementInput = {
    title?: string;
    body?: string | null;
    target_audience?: string;
    cohort_id?: number | null;
    event_id?: number | null;
    is_auto?: boolean;
    is_published?: boolean;
    publish_at?: string | null;
    cta_label?: string | null;
    cta_url?: string | null;
    cta_open_in_new_tab?: boolean;
    created_by?: number | null;
};
// Handles 'createAnnouncement' workflow for this module.
export async function createAnnouncement(input: AnnouncementInput, db: DbClient = pool) {
    return db.query(`
      INSERT INTO announcements
        (title, body, target_audience, cohort_id, event_id, is_auto, is_published, publish_at, cta_label, cta_url, cta_open_in_new_tab, created_by, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
    `, [
        input.title,
        input.body,
        input.target_audience,
        input.cohort_id ?? null,
        input.event_id ?? null,
        input.is_auto,
        input.is_published,
        input.publish_at ?? null,
        input.cta_label ?? null,
        input.cta_url ?? null,
        input.cta_open_in_new_tab ?? false,
        input.created_by,
    ]);
}
// Handles 'getAnnouncementById' workflow for this module.
export async function getAnnouncementById(id: number, db: DbClient = pool) {
    return db.query(`
      SELECT *
      FROM announcements
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `, [id]);
}
// Handles 'countAnnouncements' workflow for this module.
export async function countAnnouncements(whereClause: string, params: unknown[], db: DbClient = pool) {
    const scopedWhere = whereClause ? `${whereClause} AND deleted_at IS NULL` : "WHERE deleted_at IS NULL";
    return db.query(`SELECT COUNT(*)::int AS total FROM announcements ${scopedWhere}`, params);
}
// Handles 'listAnnouncements' workflow for this module.
export async function listAnnouncements(
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
      FROM announcements
      ${scopedWhere}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'updateAnnouncement' workflow for this module.
export async function updateAnnouncement(id: number, setClause: string, values: unknown[], db: DbClient = pool) {
    return db.query(`
      UPDATE announcements
      SET ${setClause}
      WHERE id = $${values.length + 1}
        AND deleted_at IS NULL
      RETURNING *
    `, [...values, id]);
}
// Handles 'deleteAnnouncement' workflow for this module.
export async function deleteAnnouncement(id: number, db: DbClient = pool) {
    return db.query(`
      UPDATE announcements
      SET deleted_at = NOW(), is_published = FALSE
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
    `, [id]);
}

// Handles 'findActiveAutoAnnouncementByCohortId' workflow for this module.
export async function findActiveAutoAnnouncementByCohortId(cohortId: number, db: DbClient = pool) {
    return db.query(`
      SELECT *
      FROM announcements
      WHERE cohort_id = $1
        AND is_auto = TRUE
        AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `, [cohortId]);
}

// Handles 'findActiveAutoAnnouncementByEventId' workflow for this module.
export async function findActiveAutoAnnouncementByEventId(eventId: number, db: DbClient = pool) {
    return db.query(`
      SELECT *
      FROM announcements
      WHERE event_id = $1
        AND is_auto = TRUE
        AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `, [eventId]);
}

