// File: server/src/controllers/notifications.controller.ts
// Purpose: Handles HTTP request and response flow for notifications.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { listNotificationsService, markAllNotificationsReadService, markNotificationReadService, } from "../services/notifications.service.js";
import { clearReadNotificationsService } from "../services/notifications.service.js";
import { clearReadNotificationsOlderThanService } from "../services/notifications.service.js";
// Handles 'getNotifications' workflow for this module.
export async function getNotifications(req: Request, res: Response) {
    const result = await listNotificationsService(req.user!.id, req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'markNotificationRead' workflow for this module.
export async function markNotificationRead(req: Request, res: Response) {
    const data = await markNotificationReadService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Notification marked as read.");
}
// Handles 'markAllNotificationsRead' workflow for this module.
export async function markAllNotificationsRead(req: Request, res: Response) {
    const data = await markAllNotificationsReadService(req.user!.id);
    sendSuccess(res, data, "All notifications marked as read.");
}
// Handles 'clearReadNotifications' workflow for this module.
export async function clearReadNotifications(req: Request, res: Response) {
    const data = await clearReadNotificationsService(req.user!.id);
    sendSuccess(res, data, "Read notifications cleared.");
}
// Handles 'clearReadNotificationsOlderThan' workflow for this module.
export async function clearReadNotificationsOlderThan(req: Request, res: Response) {
    const data = await clearReadNotificationsOlderThanService(req.user!.id, Number(req.query.days));
    sendSuccess(res, data, `Read notifications older than ${data.days} days cleared.`);
}





