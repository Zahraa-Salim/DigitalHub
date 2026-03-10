// File: server/src/routes/overview.routes.ts
// Purpose: Registers the Express routes for overview.
// It wires endpoint paths to middleware and controller handlers for this feature area.

// @ts-nocheck

import { Router } from "express";
import {
  deleteOverviewMessage,
  getAdminOverview,
  listOverviewMessages,
  resendOverviewMessage,
  retryFailedOverviewMessages,
} from "../controllers/overview.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  overviewMessageIdParamsSchema,
  overviewMessagesQuerySchema,
  overviewRetryFailedMessagesBodySchema,
} from "../schemas/overview.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const overviewRouter = Router();

overviewRouter.use(verifyAdminAuth);
overviewRouter.get("/", asyncHandler(getAdminOverview));
overviewRouter.get(
  "/messages",
  validateRequest({ query: overviewMessagesQuerySchema }),
  asyncHandler(listOverviewMessages),
);
overviewRouter.post(
  "/messages/retry-failed",
  validateRequest({ body: overviewRetryFailedMessagesBodySchema }),
  asyncHandler(retryFailedOverviewMessages),
);
overviewRouter.post(
  "/messages/:messageId/resend",
  validateRequest({ params: overviewMessageIdParamsSchema }),
  asyncHandler(resendOverviewMessage),
);
overviewRouter.delete(
  "/messages/:messageId",
  validateRequest({ params: overviewMessageIdParamsSchema }),
  asyncHandler(deleteOverviewMessage),
);

export { overviewRouter };

