// File: server/src/routes/announcements.routes.ts
// Purpose: Registers the Express routes for announcements.
// It wires endpoint paths to middleware and controller handlers for this feature area.

// @ts-nocheck

import { Router } from "express";
import { createAnnouncement, deleteAnnouncement, getAnnouncements, patchAnnouncement, } from "../controllers/announcements.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { announcementCreateSchema, announcementPatchSchema, idParamsSchema, } from "../schemas/announcements.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const announcementsRouter = Router();
announcementsRouter.use(verifyAdminAuth);
announcementsRouter.post("/", validateRequest({ body: announcementCreateSchema }), asyncHandler(createAnnouncement));
announcementsRouter.get("/", asyncHandler(getAnnouncements));
announcementsRouter.patch("/:id", validateRequest({ params: idParamsSchema, body: announcementPatchSchema }), asyncHandler(patchAnnouncement));
announcementsRouter.delete("/:id", validateRequest({ params: idParamsSchema }), asyncHandler(deleteAnnouncement));
export { announcementsRouter };

