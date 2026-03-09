// File: server/src/controllers/auth.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { sendSuccess } from "../utils/httpResponse.js";
import { sendList } from "../utils/httpResponse.js";
import { forgotPasswordService, getMyAdminProfile, listAllAdmins, listUsersForMessagingService, loginAdmin, resetPasswordService, sendMessagingUsersService, updateAdminBySuperAdmin, updateMyAdminProfile } from "../services/auth.service.js";
export async function login(req, res) {
    const payload = req.body;
    const data = await loginAdmin(payload);
    sendSuccess(res, data, "Login successful");
}

export async function forgotPassword(req, res) {
    const data = await forgotPasswordService(req.body);
    sendSuccess(res, data, data.message);
}

export async function resetPassword(req, res) {
    const data = await resetPasswordService(req.params.token, req.body);
    sendSuccess(res, data, data.message);
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
export async function patchAdmin(req, res) {
    const data = await updateAdminBySuperAdmin(req.user.id, req.user.role, Number(req.params.userId), req.body);
    sendSuccess(res, data, "Admin updated successfully.");
}

export async function getUsers(req, res) {
    const result = await listUsersForMessagingService(req.user.role, req.query);
    sendList(res, result.data, result.pagination);
}

export async function postUsersMessage(req, res) {
    const data = await sendMessagingUsersService(req.user.id, req.user.role, req.body);
    sendSuccess(res, data, "Messages sent.");
}


