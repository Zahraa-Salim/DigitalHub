// File: server/src/controllers/events.controller.ts
// Purpose: Handles HTTP request and response flow for events.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createEventService, deleteEventService, listEventsService, markEventDoneService, patchEventService, uploadEventImageService, } from "../services/events.service.js";
// Handles 'createEvent' workflow for this module.
export async function createEvent(req: Request, res: Response) {
    const data = await createEventService(req.user!.id, req.body);
    sendSuccess(res, data, "Event created successfully.", 201);
}
// Handles 'getEvents' workflow for this module.
export async function getEvents(req: Request, res: Response) {
    const result = await listEventsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'patchEvent' workflow for this module.
export async function patchEvent(req: Request, res: Response) {
    const data = await patchEventService(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Event updated successfully.");
}
// Handles 'deleteEvent' workflow for this module.
export async function deleteEvent(req: Request, res: Response) {
    const data = await deleteEventService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Event deleted successfully.");
}
// Handles 'markEventDone' workflow for this module.
export async function markEventDone(req: Request, res: Response) {
    const data = await markEventDoneService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Event marked as done.");
}
// Handles 'postEventImage' workflow for this module.
export async function postEventImage(req: Request, res: Response) {
    const data = await uploadEventImageService(req.user!.id, req.body);
    sendSuccess(res, data, "Event image uploaded successfully.", 201);
}





