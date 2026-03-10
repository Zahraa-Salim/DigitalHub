// File: server/src/controllers/announcements.controller.ts
// Purpose: Handles HTTP request and response flow for announcements.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createAnnouncementService, deleteAnnouncementService, listAnnouncementsService, patchAnnouncementService, } from "../services/announcements.service.js";
// Handles 'createAnnouncement' workflow for this module.
export async function createAnnouncement(req: Request, res: Response) {
    const data = await createAnnouncementService(req.user!.id, req.body);
    sendSuccess(res, data, "Announcement created successfully.", 201);
}
// Handles 'getAnnouncements' workflow for this module.
export async function getAnnouncements(req: Request, res: Response) {
    const result = await listAnnouncementsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'patchAnnouncement' workflow for this module.
export async function patchAnnouncement(req: Request, res: Response) {
    const data = await patchAnnouncementService(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Announcement updated successfully.");
}
// Handles 'deleteAnnouncement' workflow for this module.
export async function deleteAnnouncement(req: Request, res: Response) {
    const data = await deleteAnnouncementService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Announcement deleted successfully.");
}





