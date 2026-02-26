// File Summary: server/src/routes/auth.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { createAdmin, deleteAdmin, getAdminById, getAdmins, getMe, login, patchAdmin, patchMe } from "../controllers/auth.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { adminUserIdParamsSchema, createAdminBodySchema, loginBodySchema, superAdminUpdateAdminBodySchema, updateMeBodySchema } from "../schemas/auth.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const authRouter = Router();
authRouter.post("/login", rateLimit({
    keyPrefix: "rl:auth:login",
    windowSec: 600,
    max: 10,
}), validateRequest({ body: loginBodySchema }), asyncHandler(login));
authRouter.get("/me", verifyAdminAuth, asyncHandler(getMe));
authRouter.patch("/me", verifyAdminAuth, validateRequest({ body: updateMeBodySchema }), asyncHandler(patchMe));
authRouter.get("/admins", verifyAdminAuth, requireSuperAdmin, asyncHandler(getAdmins));
authRouter.post("/admins", verifyAdminAuth, requireSuperAdmin, validateRequest({ body: createAdminBodySchema }), asyncHandler(createAdmin));
authRouter.get("/admins/:userId", verifyAdminAuth, requireSuperAdmin, validateRequest({ params: adminUserIdParamsSchema }), asyncHandler(getAdminById));
authRouter.patch("/admins/:userId", verifyAdminAuth, requireSuperAdmin, validateRequest({ params: adminUserIdParamsSchema, body: superAdminUpdateAdminBodySchema }), asyncHandler(patchAdmin));
authRouter.delete("/admins/:userId", verifyAdminAuth, requireSuperAdmin, validateRequest({ params: adminUserIdParamsSchema }), asyncHandler(deleteAdmin));
export { authRouter };


