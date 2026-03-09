// File: server/src/routes/profiles.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
// @ts-nocheck
import { Router } from "express";
import { activateInstructor, deactivateInstructor, getInstructorProfiles, getManagerProfiles, getStudentProfiles, patchInstructorProfile, patchInstructorVisibility, patchManagerProfile, patchManagerVisibility, patchStudentStatus, patchStudentVisibility, getStudentProfileHandler, updateStudentProfileHandler, getPublicStudentProfileHandler, postInstructorAvatar, postInstructorProfile } from "../controllers/profiles.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { emptyProfileBodySchema, instructorAvatarUploadSchema, instructorCreateSchema, instructorPatchSchema, managerPatchSchema, studentStatusPatchSchema, userIdParamsSchema, visibilitySchema, studentUserIdParamsSchema, publicSlugParamsSchema, updateStudentProfileBodySchema } from "../schemas/profiles.schemas.js";
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
profilesRouter.patch("/students/:userId/status", validateRequest({ params: studentUserIdParamsSchema, body: studentStatusPatchSchema }), asyncHandler(patchStudentStatus));

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
profilesRouter.patch("/students/:userId/visibility", validateRequest({ params: userIdParamsSchema, body: visibilitySchema }), asyncHandler(patchStudentVisibility));

export { profilesRouter };
