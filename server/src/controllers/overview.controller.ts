// File: server/src/controllers/overview.controller.ts
// Purpose: Handles HTTP request and response flow for overview.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { getAdminOverviewService } from "../services/overview.service.js";
import {
  deleteOverviewMessageService,
  listOverviewMessagesService,
  resendOverviewMessageService,
  retryFailedOverviewMessagesService,
} from "../services/overview.service.js";
import { sendList, sendSuccess } from "../utils/httpResponse.js";

// Handles 'getAdminOverview' workflow for this module.
export async function getAdminOverview(req: Request, res: Response) {
  const data = await getAdminOverviewService(req.user!);
  sendSuccess(res, data);
}

// Handles 'retryFailedOverviewMessages' workflow for this module.
export async function retryFailedOverviewMessages(req: Request, res: Response) {
  const data = await retryFailedOverviewMessagesService(req.user!.id, req.body);
  sendSuccess(res, data, "Failed messages retry completed.");
}

// Handles 'listOverviewMessages' workflow for this module.
export async function listOverviewMessages(req: Request, res: Response) {
  const result = await listOverviewMessagesService(req.query);
  sendList(res, result.data, result.pagination);
}

// Handles 'resendOverviewMessage' workflow for this module.
export async function resendOverviewMessage(req: Request, res: Response) {
  const data = await resendOverviewMessageService(req.user!.id, Number(req.params.messageId));
  sendSuccess(res, data, "Message resend completed.");
}

// Handles 'deleteOverviewMessage' workflow for this module.
export async function deleteOverviewMessage(req: Request, res: Response) {
  const data = await deleteOverviewMessageService(req.user!.id, Number(req.params.messageId));
  sendSuccess(res, data, "Message deleted successfully.");
}





