// File: server/src/controllers/notifications.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { listNotificationsService, markAllNotificationsReadService, markNotificationReadService, } from "../services/notifications.service.js";
import { clearReadNotificationsService } from "../services/notifications.service.js";
import { clearReadNotificationsOlderThanService } from "../services/notifications.service.js";
export async function getNotifications(req, res) {
    const result = await listNotificationsService(req.user.id, req.query);
    sendList(res, result.data, result.pagination);
}
export async function markNotificationRead(req, res) {
    const data = await markNotificationReadService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Notification marked as read.");
}
export async function markAllNotificationsRead(req, res) {
    const data = await markAllNotificationsReadService(req.user.id);
    sendSuccess(res, data, "All notifications marked as read.");
}
export async function clearReadNotifications(req, res) {
    const data = await clearReadNotificationsService(req.user.id);
    sendSuccess(res, data, "Read notifications cleared.");
}
export async function clearReadNotificationsOlderThan(req, res) {
    const data = await clearReadNotificationsOlderThanService(req.user.id, Number(req.query.days));
    sendSuccess(res, data, `Read notifications older than ${data.days} days cleared.`);
}


