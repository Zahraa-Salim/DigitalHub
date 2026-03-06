// File Summary: server/src/controllers/notifications.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { listNotificationsService, markAllNotificationsReadService, markNotificationReadService, } from "../services/notifications.service.js";
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


