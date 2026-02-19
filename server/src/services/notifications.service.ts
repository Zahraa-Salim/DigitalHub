// File Summary: server/src/services/notifications.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { AppError } from "../utils/appError.js";
import { buildPagination, parseListQuery, parseQueryBoolean } from "../utils/pagination.js";
import { countNotifications, getNotificationById, listNotifications, markAllNotificationsRead, markNotificationRead, } from "../repositories/notifications.repo.js";
export async function listNotificationsService(adminId, query) {
    const list = parseListQuery(query, ["created_at"], "created_at");
    const isRead = parseQueryBoolean(query.is_read, "is_read");
    const params = [adminId];
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
export async function markNotificationReadService(id, adminId) {
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
export async function markAllNotificationsReadService(adminId) {
    const result = await markAllNotificationsRead(adminId);
    return { updated: result.rowCount ?? 0 };
}


