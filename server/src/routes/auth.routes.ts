// File: server/src/routes/auth.routes.ts
// Purpose: Registers the Express routes for auth.
// It wires endpoint paths to middleware and controller handlers for this feature area.

// @ts-nocheck

import { Router } from "express";
import { forgotPassword, getAdmins, getMe, getUsers, login, patchAdmin, patchMe, postUsersMessage, resetPassword } from "../controllers/auth.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { adminUserIdParamsSchema, forgotPasswordBodySchema, loginBodySchema, resetPasswordBodySchema, resetPasswordParamsSchema, sendMessagingUsersBodySchema, superAdminUpdateAdminBodySchema, updateMeBodySchema } from "../schemas/auth.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const authRouter = Router();
authRouter.post("/login", rateLimit({
    keyPrefix: "rl:auth:login",
    windowSec: 600,
    max: 10,
}), validateRequest({ body: loginBodySchema }), asyncHandler(login));
authRouter.post("/forgot-password", rateLimit({
    keyPrefix: "rl:auth:forgot-password",
    windowSec: 600,
    max: 10,
}), validateRequest({ body: forgotPasswordBodySchema }), asyncHandler(forgotPassword));
authRouter.post("/reset-password/:token", rateLimit({
    keyPrefix: "rl:auth:reset-password",
    windowSec: 600,
    max: 10,
}), validateRequest({ params: resetPasswordParamsSchema, body: resetPasswordBodySchema }), asyncHandler(resetPassword));
authRouter.get("/me", verifyAdminAuth, asyncHandler(getMe));
authRouter.patch("/me", verifyAdminAuth, validateRequest({ body: updateMeBodySchema }), asyncHandler(patchMe));
authRouter.get("/admins", verifyAdminAuth, asyncHandler(getAdmins));
authRouter.get("/users", verifyAdminAuth, asyncHandler(getUsers));
authRouter.post("/users/messages", verifyAdminAuth, validateRequest({ body: sendMessagingUsersBodySchema }), asyncHandler(postUsersMessage));
authRouter.patch("/admins/:userId", verifyAdminAuth, validateRequest({ params: adminUserIdParamsSchema, body: superAdminUpdateAdminBodySchema }), asyncHandler(patchAdmin));
export { authRouter };

