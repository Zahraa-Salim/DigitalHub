// File Summary: server/src/controllers/announcements.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
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


