// File: server/src/controllers/auth.controller.ts
// Purpose: Handles HTTP request and response flow for auth.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendSuccess } from "../utils/httpResponse.js";
import { sendList } from "../utils/httpResponse.js";
import { forgotPasswordService, getMyAdminProfile, listAllAdmins, listUsersForMessagingService, loginAdmin, resetPasswordService, sendMessagingUsersService, updateAdminBySuperAdmin, updateMyAdminProfile } from "../services/auth.service.js";
// Handles 'login' workflow for this module.
export async function login(req: Request, res: Response) {
    const payload = req.body;
    const data = await loginAdmin(payload);
    sendSuccess(res, data, "Login successful");
}

// Handles 'forgotPassword' workflow for this module.
export async function forgotPassword(req: Request, res: Response) {
    const data = await forgotPasswordService(req.body);
    sendSuccess(res, data, data.message);
}

// Handles 'resetPassword' workflow for this module.
export async function resetPassword(req: Request, res: Response) {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const data = await resetPasswordService(String(token || ""), req.body);
    sendSuccess(res, data, data.message);
}
// Handles 'getMe' workflow for this module.
export async function getMe(req: Request, res: Response) {
    const data = await getMyAdminProfile(req.user!.id);
    sendSuccess(res, data, "Profile loaded successfully.");
}
// Handles 'patchMe' workflow for this module.
export async function patchMe(req: Request, res: Response) {
    const data = await updateMyAdminProfile(req.user!.id, req.body);
    sendSuccess(res, data, "Profile updated successfully.");
}
// Handles 'getAdmins' workflow for this module.
export async function getAdmins(req: Request, res: Response) {
    const data = await listAllAdmins(req.user!.role);
    sendSuccess(res, data, "Admins loaded successfully.");
}
// Handles 'patchAdmin' workflow for this module.
export async function patchAdmin(req: Request, res: Response) {
    const data = await updateAdminBySuperAdmin(req.user!.id, req.user!.role, Number(req.params.userId), req.body);
    sendSuccess(res, data, "Admin updated successfully.");
}

// Handles 'getUsers' workflow for this module.
export async function getUsers(req: Request, res: Response) {
    const result = await listUsersForMessagingService(req.user!.role, req.query);
    sendList(res, result.data, result.pagination);
}

// Handles 'postUsersMessage' workflow for this module.
export async function postUsersMessage(req: Request, res: Response) {
    const data = await sendMessagingUsersService(req.user!.id, req.user!.role, req.body);
    sendSuccess(res, data, "Messages sent.");
}





