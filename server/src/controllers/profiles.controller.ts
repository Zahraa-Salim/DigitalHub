// File: server/src/controllers/profiles.controller.ts
// Purpose: Handles HTTP request and response flow for profiles.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  createInstructorProfileService,
  getPublicStudentProfile,
  getStudentProfile,
  listStudentProfilesAdminService,
  listProfilesService,
  patchStudentStatusService,
  patchProfileService,
  patchProfileVisibilityService,
  setInstructorActivationService,
  uploadInstructorAvatarService,
  updateStudentProfileAdmin,
} from "../services/profiles.service.js";

type ProfileTableName = "admin_profiles" | "instructor_profiles" | "student_profiles";
// Handles 'createListHandler' workflow for this module.
function createListHandler(tableName: ProfileTableName, sortColumns: readonly string[]) {
    return async (req: Request, res: Response) => {
        const result = await listProfilesService(tableName, sortColumns, req.query);
        sendList(res, result.data, result.pagination);
    };
}
// Handles 'createPatchHandler' workflow for this module.
function createPatchHandler(tableName: ProfileTableName, allowedUpdates: readonly string[]) {
    return async (req: Request, res: Response) => {
        const data = await patchProfileService(tableName, allowedUpdates, Number(req.params.userId), req.user!.id, req.user!.role, req.body);
        sendSuccess(res, data, "Profile updated successfully.");
    };
}
// Handles 'createVisibilityHandler' workflow for this module.
function createVisibilityHandler(tableName: ProfileTableName) {
    return async (req: Request, res: Response) => {
        const data = await patchProfileVisibilityService(tableName, Number(req.params.userId), req.user!.id, req.user!.role, req.body.is_public);
        sendSuccess(res, data, "Profile visibility updated successfully.");
    };
}
// Handles 'getStudentProfiles' workflow for this module.
export async function getStudentProfiles(req: Request, res: Response) {
    const result = await listStudentProfilesAdminService(req.query);
    sendList(res, result.data, result.pagination);
}
export const patchStudentProfile = createPatchHandler("student_profiles", [
    "full_name",
    "avatar_url",
    "bio",
    "linkedin_url",
    "github_url",
    "portfolio_url",
    "featured",
    "featured_rank",
    "public_slug",
    "is_graduated",
    "is_working",
    "open_to_work",
    "company_work_for",
]);
export const patchStudentVisibility = createVisibilityHandler("student_profiles");
// Handles 'patchStudentStatus' workflow for this module.
export async function patchStudentStatus(req: Request, res: Response) {
    const data = await patchStudentStatusService(
      req.user!.id,
      req.user!.role,
      Number(req.params.userId),
      req.body,
    );
    sendSuccess(res, data, "Student status updated successfully.");
}
export const getInstructorProfiles = createListHandler("instructor_profiles", [
    "user_id",
    "full_name",
    "created_at",
]);
export const patchInstructorProfile = createPatchHandler("instructor_profiles", [
    "full_name",
    "avatar_url",
    "bio",
    "expertise",
    "skills",
    "linkedin_url",
    "github_url",
    "portfolio_url",
    "sort_order",
]);
export const patchInstructorVisibility = createVisibilityHandler("instructor_profiles");
// Handles 'postInstructorProfile' workflow for this module.
export async function postInstructorProfile(req: Request, res: Response) {
    const data = await createInstructorProfileService(req.user!.id, req.body);
    sendSuccess(res, data, "Instructor created successfully.", 201);
}
// Handles 'postInstructorAvatar' workflow for this module.
export async function postInstructorAvatar(req: Request, res: Response) {
    const data = await uploadInstructorAvatarService(req.user!.id, req.body);
    sendSuccess(res, data, "Instructor avatar uploaded successfully.", 201);
}
// Handles 'activateInstructor' workflow for this module.
export async function activateInstructor(req: Request, res: Response) {
    const data = await setInstructorActivationService(req.user!.id, Number(req.params.userId), true);
    sendSuccess(res, data, "Instructor activated successfully.");
}
// Handles 'deactivateInstructor' workflow for this module.
export async function deactivateInstructor(req: Request, res: Response) {
    const data = await setInstructorActivationService(req.user!.id, Number(req.params.userId), false);
    sendSuccess(res, data, "Instructor deactivated successfully.");
}
export const getManagerProfiles = createListHandler("admin_profiles", [
    "user_id",
    "full_name",
    "admin_role",
    "sort_order",
    "created_at",
]);
export const patchManagerProfile = createPatchHandler("admin_profiles", [
    "full_name",
    "avatar_url",
    "bio",
    "job_title",
    "skills",
    "admin_role",
    "linkedin_url",
    "github_url",
    "portfolio_url",
    "sort_order",
]);
export const patchManagerVisibility = createVisibilityHandler("admin_profiles");


// ===================================
// STUDENT PROFILE DEDICATED HANDLERS
// ===================================

/**
 * GET /profiles/students/:userId
 * Fetch student profile with user data and projects
 * Admin only access
 */
export async function getStudentProfileHandler(req: Request, res: Response) {
  const { userId } = req.params;
  const data = await getStudentProfile(Number(userId));
  sendSuccess(res, data, "Student profile loaded successfully.");
}

/**
 * PATCH /profiles/students/:userId
 * Update student profile
 * Admin only access
 */
export async function updateStudentProfileHandler(req: Request, res: Response) {
  const { userId } = req.params;
  const data = await updateStudentProfileAdmin(req.user!.id, Number(userId), req.body);
  sendSuccess(res, data, "Student profile updated successfully.");
}

/**
 * GET /public/students/:public_slug
 * Fetch public student profile
 * Public access (no auth required)
 */
export async function getPublicStudentProfileHandler(req: Request, res: Response) {
  const publicSlug = Array.isArray(req.params.public_slug)
    ? req.params.public_slug[0]
    : req.params.public_slug;
  const data = await getPublicStudentProfile(String(publicSlug || ""));
  sendSuccess(res, data, "Public profile loaded successfully.");
}





