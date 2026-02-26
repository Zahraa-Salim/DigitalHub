// File Summary: server/src/controllers/auth.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendSuccess } from "../utils/httpResponse.js";
import { createAdminBySuperAdmin, deleteAdminBySuperAdmin, getAdminProfileBySuperAdmin, getMyAdminProfile, listAllAdmins, loginAdmin, updateAdminBySuperAdmin, updateMyAdminProfile, uploadMyAdminAvatar } from "../services/auth.service.js";
export async function login(req, res) {
    const payload = req.body;
    const data = await loginAdmin(payload);
    sendSuccess(res, data, "Login successful");
}
export async function getMe(req, res) {
    const data = await getMyAdminProfile(req.user.id);
    sendSuccess(res, data, "Profile loaded successfully.");
}
export async function patchMe(req, res) {
    const data = await updateMyAdminProfile(req.user.id, req.body);
    sendSuccess(res, data, "Profile updated successfully.");
}
export async function getAdmins(req, res) {
    const data = await listAllAdmins(req.user.role);
    sendSuccess(res, data, "Admins loaded successfully.");
}
export async function createAdmin(req, res) {
    const data = await createAdminBySuperAdmin(req.user.id, req.user.role, req.body);
    sendSuccess(res, data, "Admin created successfully.");
}
export async function getAdminById(req, res) {
    const data = await getAdminProfileBySuperAdmin(req.user.role, Number(req.params.userId));
    sendSuccess(res, data, "Admin loaded successfully.");
}
export async function patchAdmin(req, res) {
    const data = await updateAdminBySuperAdmin(req.user.id, req.user.role, Number(req.params.userId), req.body);
    sendSuccess(res, data, "Admin updated successfully.");
}
export async function deleteAdmin(req, res) {
    const data = await deleteAdminBySuperAdmin(req.user.id, req.user.role, Number(req.params.userId));
    sendSuccess(res, data, "Admin deleted successfully.");
}
export async function uploadMyAvatar(req, res) {
    const data = await uploadMyAdminAvatar(req.user.id, req.body);
    sendSuccess(res, data, "Avatar uploaded successfully.");
}


