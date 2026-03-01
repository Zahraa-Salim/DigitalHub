// File Summary: server/src/routes/notifications.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { getNotifications, markAllNotificationsRead, markNotificationRead, } from "../controllers/notifications.controller.js";
import { clearReadNotifications } from "../controllers/notifications.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { emptyBodySchema, idParamsSchema } from "../schemas/notifications.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const notificationsRouter = Router();
notificationsRouter.use(verifyAdminAuth);
notificationsRouter.get("/", asyncHandler(getNotifications));
notificationsRouter.patch("/:id/read", validateRequest({ params: idParamsSchema }), asyncHandler(markNotificationRead));
notificationsRouter.patch("/read-all", validateRequest({ body: emptyBodySchema }), asyncHandler(markAllNotificationsRead));
notificationsRouter.delete("/read", asyncHandler(clearReadNotifications));
export { notificationsRouter };


