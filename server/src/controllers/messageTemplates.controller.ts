// File Summary: server/src/controllers/messageTemplates.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendSuccess } from "../utils/httpResponse.js";
import {
  createMessageTemplateService,
  listMessageTemplatesService,
  updateMessageTemplateService,
} from "../services/messageTemplates.service.js";

export async function listMessageTemplates(req, res) {
  const data = await listMessageTemplatesService(req.query);
  sendSuccess(res, data);
}

export async function patchMessageTemplate(req, res) {
  const data = await updateMessageTemplateService(req.params.key, req.user.id, req.body);
  sendSuccess(res, data, "Message template updated successfully.");
}

export async function createMessageTemplate(req, res) {
  const data = await createMessageTemplateService(req.user.id, req.body);
  sendSuccess(res, data, "Message template created successfully.", 201);
}
