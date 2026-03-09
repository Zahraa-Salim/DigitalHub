// File: server/src/controllers/announcements.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createAnnouncementService, deleteAnnouncementService, listAnnouncementsService, patchAnnouncementService, } from "../services/announcements.service.js";
export async function createAnnouncement(req, res) {
    const data = await createAnnouncementService(req.user.id, req.body);
    sendSuccess(res, data, "Announcement created successfully.", 201);
}
export async function getAnnouncements(req, res) {
    const result = await listAnnouncementsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function patchAnnouncement(req, res) {
    const data = await patchAnnouncementService(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Announcement updated successfully.");
}
export async function deleteAnnouncement(req, res) {
    const data = await deleteAnnouncementService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Announcement deleted successfully.");
}


