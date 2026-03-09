// File: server/src/routes/announcements.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
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


