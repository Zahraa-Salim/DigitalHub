// File: server/src/controllers/admins.controller.ts
// Purpose: Handles HTTP request and response flow for admins.
// It reads request data, calls the matching service methods, and sends API responses.



import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  activateAdminService,
  createAdminService,
  deactivateAdminService,
  listAdminsService,
  patchAdminService,
} from "../services/admins.service.js";

// Handles 'getAdmins' workflow for this module.
export async function getAdmins(req: Request, res: Response) {
  const result = await listAdminsService(req.query);
  sendList(res, result.data, result.pagination);
}

// Handles 'postAdmin' workflow for this module.
export async function postAdmin(req: Request, res: Response) {
  const data = await createAdminService(req.user!.id, req.body);
  sendSuccess(res, data, "Admin created successfully.", 201);
}

// Handles 'patchAdmin' workflow for this module.
export async function patchAdmin(req: Request, res: Response) {
  const data = await patchAdminService(Number(req.params.userId), req.user!.id, req.body);
  sendSuccess(res, data, "Admin updated successfully.");
}

// Handles 'deactivateAdmin' workflow for this module.
export async function deactivateAdmin(req: Request, res: Response) {
  const data = await deactivateAdminService(Number(req.params.userId), req.user!.id);
  sendSuccess(res, data, "Admin deactivated successfully.");
}

// Handles 'activateAdmin' workflow for this module.
export async function activateAdmin(req: Request, res: Response) {
  const data = await activateAdminService(Number(req.params.userId), req.user!.id);
  sendSuccess(res, data, "Admin activated successfully.");
}





