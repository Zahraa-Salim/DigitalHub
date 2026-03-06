// File Summary: server/src/controllers/events.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createEventService, deleteEventService, listEventsService, markEventDoneService, patchEventService, } from "../services/events.service.js";
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


