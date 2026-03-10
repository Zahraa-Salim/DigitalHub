// File: server/src/services/notifications.service.ts
// Purpose: Implements the business rules for notifications.
// It coordinates validation, data access, and side effects before results go back to controllers.


import { AppError } from "../utils/appError.js";
import { buildPagination, parseListQuery, parseQueryBoolean } from "../utils/pagination.js";
import { countNotifications, getNotificationById, listNotifications, markAllNotificationsRead, markNotificationRead, } from "../repositories/notifications.repo.js";
import { clearReadNotifications } from "../repositories/notifications.repo.js";
import { clearReadNotificationsOlderThan } from "../repositories/notifications.repo.js";

type NotificationsQuery = Record<string, unknown> & {
    is_read?: string | boolean;
};
// Handles 'listNotificationsService' workflow for this module.
export async function listNotificationsService(adminId: number, query: NotificationsQuery) {
    const list = parseListQuery(query, ["created_at"], "created_at");
    const isRead = parseQueryBoolean(query.is_read, "is_read");
    const params: Array<number | boolean> = [adminId];
    const where = ["recipient_admin_user_id = $1"];
    if (isRead !== undefined) {
        params.push(isRead);
        where.push(`is_read = $${params.length}`);
    }
    const whereClause = `WHERE ${where.join(" AND ")}`;
    const countResult = await countNotifications(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listNotifications(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
// Handles 'markNotificationReadService' workflow for this module.
export async function markNotificationReadService(id: number, adminId: number) {
    const notificationResult = await getNotificationById(id, adminId);
    if (!notificationResult.rowCount) {
        throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found.");
    }
    if (notificationResult.rows[0].is_read) {
        throw new AppError(409, "NOTIFICATION_ALREADY_READ", "Notification is already marked as read.");
    }
    const result = await markNotificationRead(id, adminId);
    return result.rows[0];
}
// Handles 'markAllNotificationsReadService' workflow for this module.
export async function markAllNotificationsReadService(adminId: number) {
    const result = await markAllNotificationsRead(adminId);
    return { updated: result.rowCount ?? 0 };
}
// Handles 'clearReadNotificationsService' workflow for this module.
export async function clearReadNotificationsService(adminId: number) {
    const result = await clearReadNotifications(adminId);
    return { deleted: result.rowCount ?? 0 };
}
// Handles 'clearReadNotificationsOlderThanService' workflow for this module.
export async function clearReadNotificationsOlderThanService(adminId: number, days: number) {
    const result = await clearReadNotificationsOlderThan(adminId, days);
    return { deleted: result.rowCount ?? 0, days };
}

