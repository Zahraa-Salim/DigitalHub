// File Summary: server/src/controllers/profiles.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { listProfilesService, patchProfileService, patchProfileVisibilityService, } from "../services/profiles.service.js";
function createListHandler(tableName, sortColumns) {
    return async (req, res) => {
        const result = await listProfilesService(tableName, sortColumns, req.query);
        sendList(res, result.data, result.pagination);
    };
}
function createPatchHandler(tableName, allowedUpdates) {
    return async (req, res) => {
        const data = await patchProfileService(tableName, allowedUpdates, Number(req.params.userId), req.user.id, req.body);
        sendSuccess(res, data, "Profile updated successfully.");
    };
}
function createVisibilityHandler(tableName) {
    return async (req, res) => {
        const data = await patchProfileVisibilityService(tableName, Number(req.params.userId), req.user.id, req.body.is_public);
        sendSuccess(res, data, "Profile visibility updated successfully.");
    };
}
export const getStudentProfiles = createListHandler("student_profiles", [
    "user_id",
    "full_name",
    "featured_rank",
    "created_at",
]);
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
]);
export const patchStudentVisibility = createVisibilityHandler("student_profiles");
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
    "linkedin_url",
    "github_url",
    "portfolio_url",
]);
export const patchInstructorVisibility = createVisibilityHandler("instructor_profiles");
export const getManagerProfiles = createListHandler("manager_profiles", [
    "user_id",
    "full_name",
    "sort_order",
    "created_at",
]);
export const patchManagerProfile = createPatchHandler("manager_profiles", [
    "full_name",
    "avatar_url",
    "bio",
    "job_title",
    "linkedin_url",
    "github_url",
    "portfolio_url",
    "sort_order",
]);
export const patchManagerVisibility = createVisibilityHandler("manager_profiles");


