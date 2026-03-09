// File Summary: server/src/routes/overview.routes.ts
// Layer: routes
// Purpose: Exposes admin overview aggregate endpoint(s).
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { getAdminOverview, listOverviewMessages, retryFailedOverviewMessages } from "../controllers/overview.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { overviewMessagesQuerySchema, overviewRetryFailedMessagesBodySchema } from "../schemas/overview.schemas.js";
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

export { overviewRouter };
