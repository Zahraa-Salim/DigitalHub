// File Summary: server/src/routes/public.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { getPublicAdmins, getPublicAnnouncements, getPublicCohorts, getPublicEvents, getPublicHome, getPublicInstructors, getPublicManagers, getPublicPrograms, getPublicStudentBySlug, getPublicStudents, getPublicTheme, } from "../controllers/public.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const publicRouter = Router();
publicRouter.get("/theme", asyncHandler(getPublicTheme));
publicRouter.get("/home", asyncHandler(getPublicHome));
publicRouter.get("/programs", asyncHandler(getPublicPrograms));
publicRouter.get("/cohorts", asyncHandler(getPublicCohorts));
publicRouter.get("/events", asyncHandler(getPublicEvents));
publicRouter.get("/announcements", asyncHandler(getPublicAnnouncements));
publicRouter.get("/admins", asyncHandler(getPublicAdmins));
publicRouter.get("/managers", asyncHandler(getPublicManagers));
publicRouter.get("/instructors", asyncHandler(getPublicInstructors));
publicRouter.get("/students", asyncHandler(getPublicStudents));
publicRouter.get("/students/:public_slug", asyncHandler(getPublicStudentBySlug));
export { publicRouter };


