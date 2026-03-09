// File: server/src/routes/messageTemplates.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
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
