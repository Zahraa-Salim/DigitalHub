// File: server/src/repositories/notifications.repo.ts
// What this code does:
// 1) Implements module-specific behavior for this code unit.
// 2) Coordinates inputs, internal processing, and outputs.
// 3) Uses shared utilities to keep logic consistent and reusable.
// 4) Exports functions/components used by other project modules.
// @ts-nocheck
import { pool } from "../db/index.js";

function isTransientDatabaseError(error) {
    if (!error || typeof error !== "object") {
        return false;
    }
    const code = String(error.code || "").toUpperCase();
    const message = String(error.message || "").toLowerCase();
    return (code === "08P01" ||
        code === "08006" ||
        code === "08001" ||
        code === "57P01" ||
        code === "ENOTFOUND" ||
        code === "EAI_AGAIN" ||
        code === "ETIMEDOUT" ||
        code === "ECONNRESET" ||
        message.includes("authentication timed out") ||
        message.includes("connection terminated unexpectedly") ||
        message.includes("getaddrinfo"));
}

async function queryWithRetry(runQuery) {
    const maxAttempts = 3;
    let attempt = 0;
    while (attempt < maxAttempts) {
        try {
            return await runQuery();
        }
        catch (error) {
            attempt += 1;
            if (!isTransientDatabaseError(error) || attempt >= maxAttempts) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        }
    }
    return runQuery();
}

export async function countNotifications(whereClause, params, db = pool) {
    return queryWithRetry(() => db.query(`SELECT COUNT(*)::int AS total FROM admin_notifications ${whereClause}`, params));
}
export async function listNotifications(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return queryWithRetry(() => db.query(`
      SELECT id, recipient_admin_user_id, log_id, title, body, is_read, read_at, created_at
      FROM admin_notifications
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]));
}
export async function getNotificationById(id, adminId, db = pool) {
    return queryWithRetry(() => db.query(`
      SELECT id, is_read
      FROM admin_notifications
      WHERE id = $1
        AND recipient_admin_user_id = $2
    `, [id, adminId]));
}
export async function markNotificationRead(id, adminId, db = pool) {
    return queryWithRetry(() => db.query(`
      UPDATE admin_notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE id = $1
        AND recipient_admin_user_id = $2
      RETURNING *
    `, [id, adminId]));
}
export async function markAllNotificationsRead(adminId, db = pool) {
    return queryWithRetry(() => db.query(`
      UPDATE admin_notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE recipient_admin_user_id = $1
        AND is_read = FALSE
    `, [adminId]));
}
export async function clearReadNotifications(adminId, db = pool) {
    return queryWithRetry(() => db.query(`
      DELETE FROM admin_notifications
      WHERE recipient_admin_user_id = $1
        AND is_read = TRUE
    `, [adminId]));
}
export async function clearReadNotificationsOlderThan(adminId, days, db = pool) {
    return queryWithRetry(() => db.query(`
      DELETE FROM admin_notifications
      WHERE recipient_admin_user_id = $1
        AND is_read = TRUE
        AND COALESCE(read_at, created_at) < NOW() - ($2 * INTERVAL '1 day')
    `, [adminId, days]));
}


