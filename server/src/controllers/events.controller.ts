// File: server/src/controllers/events.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createEventService, deleteEventService, listEventsService, markEventDoneService, patchEventService, uploadEventImageService, } from "../services/events.service.js";
export async function createEvent(req, res) {
    const data = await createEventService(req.user.id, req.body);
    sendSuccess(res, data, "Event created successfully.", 201);
}
export async function getEvents(req, res) {
    const result = await listEventsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function patchEvent(req, res) {
    const data = await patchEventService(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Event updated successfully.");
}
export async function deleteEvent(req, res) {
    const data = await deleteEventService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Event deleted successfully.");
}
export async function markEventDone(req, res) {
    const data = await markEventDoneService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Event marked as done.");
}
export async function postEventImage(req, res) {
    const data = await uploadEventImageService(req.user.id, req.body);
    sendSuccess(res, data, "Event image uploaded successfully.", 201);
}


