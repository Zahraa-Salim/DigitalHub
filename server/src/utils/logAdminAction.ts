// File: server/src/utils/logAdminAction.ts
// Purpose: Provides shared helper logic for log admin action.
// It supports other backend modules with reusable utility functions.


import { pool } from "../db/index.js";

type Queryable = {
    query<T = Record<string, unknown>>(
        text: string,
        params?: unknown[],
    ): Promise<{ rows: T[]; rowCount: number | null }>;
};

type LogAdminActionInput = {
    actorUserId: number | null;
    action: string;
    entityType?: string;
    entityId?: number | null;
    message: string;
    metadata?: Record<string, unknown>;
    title?: string;
    body?: string;
};

// Handles 'logAdminAction' workflow for this module.
export async function logAdminAction(input: LogAdminActionInput, client: Queryable = pool): Promise<void> {
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
    const adminsResult = await client.query<{ id: number }>(`
      SELECT id
      FROM users
      WHERE is_admin = TRUE
    `);
    if (!adminsResult.rowCount) {
        return;
    }
    const notificationTitle = input.title ?? input.action;
    const notificationBody = input.body ?? input.message;
    const values: unknown[] = [];
    const placeholders: string[] = [];
    adminsResult.rows.forEach((row, index: number) => {
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

