// File Summary: server/src/controllers/overview.controller.ts
// Layer: controllers
// Purpose: Maps overview HTTP requests to service and returns standardized response.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { getAdminOverviewService } from "../services/overview.service.js";
import { retryFailedOverviewMessagesService } from "../services/overview.service.js";
import { sendSuccess } from "../utils/httpResponse.js";

export async function getAdminOverview(req, res) {
  const data = await getAdminOverviewService(req.user);
  sendSuccess(res, data);
}

export async function retryFailedOverviewMessages(req, res) {
  const data = await retryFailedOverviewMessagesService(req.user.id, req.body);
  sendSuccess(res, data, "Failed messages retry completed.");
}
