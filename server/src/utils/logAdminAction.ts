// File: server/src/utils/logAdminAction.ts
// What this code does:
// 1) Provides reusable helper functions for backend modules.
// 2) Encapsulates common formatting, parsing, and safety checks.
// 3) Keeps route/controller code focused on workflow logic.
// 4) Avoids duplicating low-level utility code across files.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function logAdminAction(input, client = pool) {
    const logResult = await client.query(`
      INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, message, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
        input.actorUserId,
        input.action,
        input.entityType ?? "system",
        input.entityId ?? null,
        input.message,
        input.metadata ?? {},
    ]);
    const logId = Number(logResult.rows[0]?.id);
    const adminsResult = await client.query(`
      SELECT id
      FROM users
      WHERE is_admin = TRUE
    `);
    if (!adminsResult.rowCount) {
        return;
    }
    const notificationTitle = input.title ?? input.action;
    const notificationBody = input.body ?? input.message;
    const values = [];
    const placeholders = [];
    adminsResult.rows.forEach((row, index) => {
        const base = index * 4;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
        values.push(row.id, logId, notificationTitle, notificationBody);
    });
    await client.query(`
      INSERT INTO admin_notifications
        (recipient_admin_user_id, log_id, title, body)
      VALUES ${placeholders.join(",")}
    `, values);
}


