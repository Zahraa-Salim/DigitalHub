// File Summary: server/src/routes/auth.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { getAdmins, getMe, getUsers, login, patchAdmin, patchMe, postUsersMessage } from "../controllers/auth.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { adminUserIdParamsSchema, loginBodySchema, sendMessagingUsersBodySchema, superAdminUpdateAdminBodySchema, updateMeBodySchema } from "../schemas/auth.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const authRouter = Router();
authRouter.post("/login", rateLimit({
    keyPrefix: "rl:auth:login",
    windowSec: 600,
    max: 10,
}), validateRequest({ body: loginBodySchema }), asyncHandler(login));
authRouter.get("/me", verifyAdminAuth, asyncHandler(getMe));
authRouter.patch("/me", verifyAdminAuth, validateRequest({ body: updateMeBodySchema }), asyncHandler(patchMe));
authRouter.get("/admins", verifyAdminAuth, asyncHandler(getAdmins));
authRouter.get("/users", verifyAdminAuth, asyncHandler(getUsers));
authRouter.post("/users/messages", verifyAdminAuth, validateRequest({ body: sendMessagingUsersBodySchema }), asyncHandler(postUsersMessage));
authRouter.patch("/admins/:userId", verifyAdminAuth, validateRequest({ params: adminUserIdParamsSchema, body: superAdminUpdateAdminBodySchema }), asyncHandler(patchAdmin));
export { authRouter };


