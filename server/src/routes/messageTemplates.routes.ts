// File Summary: server/src/routes/messageTemplates.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import {
  createMessageTemplate,
  listMessageTemplates,
  patchMessageTemplate,
} from "../controllers/messageTemplates.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  messageTemplateCreateSchema,
  messageTemplateKeyParamsSchema,
  messageTemplatePatchSchema,
  messageTemplatesListQuerySchema,
} from "../schemas/messageTemplates.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const messageTemplatesRouter = Router();

messageTemplatesRouter.use(verifyAdminAuth);
messageTemplatesRouter.get(
  "/",
  validateRequest({ query: messageTemplatesListQuerySchema }),
  asyncHandler(listMessageTemplates),
);
messageTemplatesRouter.post(
  "/",
  validateRequest({ body: messageTemplateCreateSchema }),
  asyncHandler(createMessageTemplate),
);
messageTemplatesRouter.patch(
  "/:key",
  validateRequest({ params: messageTemplateKeyParamsSchema, body: messageTemplatePatchSchema }),
  asyncHandler(patchMessageTemplate),
);

export { messageTemplatesRouter };
