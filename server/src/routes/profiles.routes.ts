// File Summary: server/src/routes/profiles.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { getInstructorProfiles, getManagerProfiles, getStudentProfiles, patchInstructorProfile, patchInstructorVisibility, patchManagerProfile, patchManagerVisibility, patchStudentProfile, patchStudentVisibility, } from "../controllers/profiles.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { instructorPatchSchema, managerPatchSchema, studentPatchSchema, userIdParamsSchema, visibilitySchema, } from "../schemas/profiles.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const profilesRouter = Router();
profilesRouter.use(verifyAdminAuth);
profilesRouter.get("/students", asyncHandler(getStudentProfiles));
profilesRouter.patch("/students/:userId", validateRequest({ params: userIdParamsSchema, body: studentPatchSchema }), asyncHandler(patchStudentProfile));
profilesRouter.patch("/students/:userId/visibility", validateRequest({ params: userIdParamsSchema, body: visibilitySchema }), asyncHandler(patchStudentVisibility));
profilesRouter.get("/instructors", asyncHandler(getInstructorProfiles));
profilesRouter.patch("/instructors/:userId", validateRequest({ params: userIdParamsSchema, body: instructorPatchSchema }), asyncHandler(patchInstructorProfile));
profilesRouter.patch("/instructors/:userId/visibility", validateRequest({ params: userIdParamsSchema, body: visibilitySchema }), asyncHandler(patchInstructorVisibility));
profilesRouter.get("/managers", asyncHandler(getManagerProfiles));
profilesRouter.patch("/managers/:userId", validateRequest({ params: userIdParamsSchema, body: managerPatchSchema }), asyncHandler(patchManagerProfile));
profilesRouter.patch("/managers/:userId/visibility", validateRequest({ params: userIdParamsSchema, body: visibilitySchema }), asyncHandler(patchManagerVisibility));
export { profilesRouter };


