import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  getSubscribers,
  patchSubscriber,
  postSubscribe,
  postUnsubscribe,
} from "../controllers/subscribers.controller.js";

const subscribersRouter = Router();

// Public routes
subscribersRouter.post(
  "/subscribe",
  rateLimit({ keyPrefix: "rl:public:subscribe", windowSec: 300, max: 5 }),
  asyncHandler(postSubscribe),
);
subscribersRouter.post(
  "/unsubscribe",
  rateLimit({ keyPrefix: "rl:public:unsubscribe", windowSec: 300, max: 10 }),
  asyncHandler(postUnsubscribe),
);

// Admin routes
subscribersRouter.get("/admin/subscribers", verifyAdminAuth, asyncHandler(getSubscribers));
subscribersRouter.patch("/admin/subscribers/:id", verifyAdminAuth, asyncHandler(patchSubscriber));

export { subscribersRouter };
