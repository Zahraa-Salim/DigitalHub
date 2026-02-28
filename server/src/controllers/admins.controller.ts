// File Summary: server/src/controllers/admins.controller.ts
// Layer: controllers
// Purpose: Maps validated admin-management HTTP input to service calls and standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck

import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  activateAdminService,
  createAdminService,
  deactivateAdminService,
  listAdminsService,
  patchAdminService,
} from "../services/admins.service.js";

export async function getAdmins(req, res) {
  const result = await listAdminsService(req.query);
  sendList(res, result.data, result.pagination);
}

export async function postAdmin(req, res) {
  const data = await createAdminService(req.user.id, req.body);
  sendSuccess(res, data, "Admin created successfully.", 201);
}

export async function patchAdmin(req, res) {
  const data = await patchAdminService(Number(req.params.userId), req.user.id, req.body);
  sendSuccess(res, data, "Admin updated successfully.");
}

export async function deactivateAdmin(req, res) {
  const data = await deactivateAdminService(Number(req.params.userId), req.user.id);
  sendSuccess(res, data, "Admin deactivated successfully.");
}

export async function activateAdmin(req, res) {
  const data = await activateAdminService(Number(req.params.userId), req.user.id);
  sendSuccess(res, data, "Admin activated successfully.");
}
