// File Summary: server/src/routes/profiles.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { activateInstructor, deactivateInstructor, getInstructorProfiles, getManagerProfiles, getStudentProfiles, patchInstructorProfile, patchInstructorVisibility, patchManagerProfile, patchManagerVisibility, patchStudentProfile, patchStudentVisibility, getStudentProfileHandler, updateStudentProfileHandler, getPublicStudentProfileHandler, postInstructorAvatar, postInstructorProfile } from "../controllers/profiles.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { emptyProfileBodySchema, instructorAvatarUploadSchema, instructorCreateSchema, instructorPatchSchema, managerPatchSchema, studentPatchSchema, userIdParamsSchema, visibilitySchema, studentUserIdParamsSchema, publicSlugParamsSchema, updateStudentProfileBodySchema } from "../schemas/profiles.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const profilesRouter = Router();

// ===================================
// STUDENT PROFILE DEDICATED ROUTES
// ===================================
// NOTE: These specific routes must be defined BEFORE generic handlers
// to ensure proper matching / validation

// Public: GET /public/students/:public_slug - Fetch public student profile
profilesRouter.get("/public/students/:public_slug", validateRequest({ params: publicSlugParamsSchema }), asyncHandler(getPublicStudentProfileHandler));

// Admin-only routes with authentication
profilesRouter.use(verifyAdminAuth);

// Admin only: GET /profiles/students/:userId - Fetch specific student profile with projects
profilesRouter.get("/students/:userId", validateRequest({ params: studentUserIdParamsSchema }), asyncHandler(getStudentProfileHandler));

// Admin only: PATCH /profiles/students/:userId - Update student profile (with transaction, logging)
profilesRouter.patch("/students/:userId", validateRequest({ params: studentUserIdParamsSchema, body: updateStudentProfileBodySchema }), asyncHandler(updateStudentProfileHandler));

// ===================================
// GENERIC PROFILE ROUTES
// ===================================

// List students
profilesRouter.get("/students", asyncHandler(getStudentProfiles));
profilesRouter.get("/instructors", asyncHandler(getInstructorProfiles));
profilesRouter.post("/instructors/avatar", validateRequest({ body: instructorAvatarUploadSchema }), asyncHandler(postInstructorAvatar));
profilesRouter.post("/instructors", validateRequest({ body: instructorCreateSchema }), asyncHandler(postInstructorProfile));
profilesRouter.patch("/instructors/:userId", validateRequest({ params: userIdParamsSchema, body: instructorPatchSchema }), asyncHandler(patchInstructorProfile));
profilesRouter.patch("/instructors/:userId/visibility", validateRequest({ params: userIdParamsSchema, body: visibilitySchema }), asyncHandler(patchInstructorVisibility));
profilesRouter.post("/instructors/:userId/deactivate", validateRequest({ params: userIdParamsSchema, body: emptyProfileBodySchema }), asyncHandler(deactivateInstructor));
profilesRouter.post("/instructors/:userId/activate", validateRequest({ params: userIdParamsSchema, body: emptyProfileBodySchema }), asyncHandler(activateInstructor));
profilesRouter.get("/managers", asyncHandler(getManagerProfiles));
profilesRouter.patch("/managers/:userId", validateRequest({ params: userIdParamsSchema, body: managerPatchSchema }), asyncHandler(patchManagerProfile));
profilesRouter.patch("/managers/:userId/visibility", validateRequest({ params: userIdParamsSchema, body: visibilitySchema }), asyncHandler(patchManagerVisibility));

// STUDENT-specific endpoints (with transaction, logging, projects)
profilesRouter.patch("/students/:userId", validateRequest({ params: userIdParamsSchema, body: studentPatchSchema }), asyncHandler(patchStudentProfile));
profilesRouter.patch("/students/:userId/visibility", validateRequest({ params: userIdParamsSchema, body: visibilitySchema }), asyncHandler(patchStudentVisibility));

export { profilesRouter };
