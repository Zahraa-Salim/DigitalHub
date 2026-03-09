// File: server/src/controllers/admins.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
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
