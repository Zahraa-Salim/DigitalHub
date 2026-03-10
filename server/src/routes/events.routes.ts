// File: server/src/routes/events.routes.ts
// Purpose: Registers the Express routes for events.
// It wires endpoint paths to middleware and controller handlers for this feature area.

// @ts-nocheck

import { Router } from "express";
import { createEvent, deleteEvent, getEvents, markEventDone, patchEvent, postEventImage, } from "../controllers/events.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { eventCreateSchema, eventImageUploadSchema, eventPatchSchema, idParamsSchema } from "../schemas/events.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const eventsRouter = Router();
eventsRouter.use(verifyAdminAuth);
eventsRouter.post("/image", validateRequest({ body: eventImageUploadSchema }), asyncHandler(postEventImage));
eventsRouter.post("/", validateRequest({ body: eventCreateSchema }), asyncHandler(createEvent));
eventsRouter.get("/", asyncHandler(getEvents));
eventsRouter.patch("/:id", validateRequest({ params: idParamsSchema, body: eventPatchSchema }), asyncHandler(patchEvent));
eventsRouter.delete("/:id", validateRequest({ params: idParamsSchema }), asyncHandler(deleteEvent));
eventsRouter.patch("/:id/mark-done", validateRequest({ params: idParamsSchema }), asyncHandler(markEventDone));
export { eventsRouter };

