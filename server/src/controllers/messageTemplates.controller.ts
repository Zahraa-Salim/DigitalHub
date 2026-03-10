// File: server/src/controllers/messageTemplates.controller.ts
// Purpose: Handles HTTP request and response flow for message templates.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  createMessageTemplateService,
  listMessageTemplatesService,
  updateMessageTemplateService,
} from "../services/messageTemplates.service.js";

// Handles 'listMessageTemplates' workflow for this module.
export async function listMessageTemplates(req: Request, res: Response) {
  const result = await listMessageTemplatesService(req.query);
  sendList(res, result.data, result.pagination);
}

// Handles 'patchMessageTemplate' workflow for this module.
export async function patchMessageTemplate(req: Request, res: Response) {
  const data = await updateMessageTemplateService(String(req.params.key), req.user!.id, req.body);
  sendSuccess(res, data, "Message template updated successfully.");
}

// Handles 'createMessageTemplate' workflow for this module.
export async function createMessageTemplate(req: Request, res: Response) {
  const data = await createMessageTemplateService(req.user!.id, req.body);
  sendSuccess(res, data, "Message template created successfully.", 201);
}





