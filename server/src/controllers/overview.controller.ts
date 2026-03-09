// File: server/src/controllers/overview.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { getAdminOverviewService } from "../services/overview.service.js";
import { listOverviewMessagesService, retryFailedOverviewMessagesService } from "../services/overview.service.js";
import { sendList, sendSuccess } from "../utils/httpResponse.js";

export async function getAdminOverview(req, res) {
  const data = await getAdminOverviewService(req.user);
  sendSuccess(res, data);
}

export async function retryFailedOverviewMessages(req, res) {
  const data = await retryFailedOverviewMessagesService(req.user.id, req.body);
  sendSuccess(res, data, "Failed messages retry completed.");
}

export async function listOverviewMessages(req, res) {
  const result = await listOverviewMessagesService(req.query);
  sendList(res, result.data, result.pagination);
}
