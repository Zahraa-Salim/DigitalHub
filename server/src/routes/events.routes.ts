// File: server/src/routes/events.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
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


