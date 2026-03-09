// File: server/src/routes/overview.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
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
