// File: server/src/routes/notifications.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
// @ts-nocheck
import { Router } from "express";
import { getNotifications, markAllNotificationsRead, markNotificationRead, } from "../controllers/notifications.controller.js";
import { clearReadNotifications } from "../controllers/notifications.controller.js";
import { clearReadNotificationsOlderThan } from "../controllers/notifications.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { clearReadOlderQuerySchema, emptyBodySchema, idParamsSchema } from "../schemas/notifications.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const notificationsRouter = Router();
notificationsRouter.use(verifyAdminAuth);
notificationsRouter.get("/", asyncHandler(getNotifications));
notificationsRouter.patch("/:id/read", validateRequest({ params: idParamsSchema }), asyncHandler(markNotificationRead));
notificationsRouter.patch("/read-all", validateRequest({ body: emptyBodySchema }), asyncHandler(markAllNotificationsRead));
notificationsRouter.delete("/read", asyncHandler(clearReadNotifications));
notificationsRouter.delete("/read/older", validateRequest({ query: clearReadOlderQuerySchema }), asyncHandler(clearReadNotificationsOlderThan));
export { notificationsRouter };


