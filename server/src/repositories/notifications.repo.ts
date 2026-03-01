// File Summary: server/src/repositories/notifications.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function countNotifications(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM admin_notifications ${whereClause}`, params);
}
export async function listNotifications(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT id, recipient_admin_user_id, log_id, title, body, is_read, read_at, created_at
      FROM admin_notifications
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function getNotificationById(id, adminId, db = pool) {
    return db.query(`
      SELECT id, is_read
      FROM admin_notifications
      WHERE id = $1
        AND recipient_admin_user_id = $2
    `, [id, adminId]);
}
export async function markNotificationRead(id, adminId, db = pool) {
    return db.query(`
      UPDATE admin_notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE id = $1
        AND recipient_admin_user_id = $2
      RETURNING *
    `, [id, adminId]);
}
export async function markAllNotificationsRead(adminId, db = pool) {
    return db.query(`
      UPDATE admin_notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE recipient_admin_user_id = $1
        AND is_read = FALSE
    `, [adminId]);
}
export async function clearReadNotifications(adminId, db = pool) {
    return db.query(`
      DELETE FROM admin_notifications
      WHERE recipient_admin_user_id = $1
        AND is_read = TRUE
    `, [adminId]);
}
export async function clearReadNotificationsOlderThan(adminId, days, db = pool) {
    return db.query(`
      DELETE FROM admin_notifications
      WHERE recipient_admin_user_id = $1
        AND is_read = TRUE
        AND COALESCE(read_at, created_at) < NOW() - ($2 * INTERVAL '1 day')
    `, [adminId, days]);
}


