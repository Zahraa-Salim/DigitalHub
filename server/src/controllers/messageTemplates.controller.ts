// File: server/src/controllers/messageTemplates.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  createMessageTemplateService,
  listMessageTemplatesService,
  updateMessageTemplateService,
} from "../services/messageTemplates.service.js";

export async function listMessageTemplates(req, res) {
  const result = await listMessageTemplatesService(req.query);
  sendList(res, result.data, result.pagination);
}

export async function patchMessageTemplate(req, res) {
  const data = await updateMessageTemplateService(req.params.key, req.user.id, req.body);
  sendSuccess(res, data, "Message template updated successfully.");
}

export async function createMessageTemplate(req, res) {
  const data = await createMessageTemplateService(req.user.id, req.body);
  sendSuccess(res, data, "Message template created successfully.", 201);
}
