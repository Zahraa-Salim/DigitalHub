// File Summary: server/src/routes/admins.routes.ts
// Layer: routes
// Purpose: Exposes /api/admins endpoints for self-profile and super-admin management.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { createAdmin, deleteAdmin, getAdminById, getAdmins, getMe, patchAdmin, patchMe, uploadMyAvatar } from "../controllers/auth.controller.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { adminUserIdParamsSchema, createAdminBodySchema, superAdminUpdateAdminBodySchema, updateMeBodySchema, uploadAvatarBodySchema } from "../schemas/auth.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const adminsRouter = Router();
adminsRouter.get("/me", verifyAdminAuth, asyncHandler(getMe));
adminsRouter.put("/me", verifyAdminAuth, validateRequest({ body: updateMeBodySchema }), asyncHandler(patchMe));
adminsRouter.post("/me/avatar", verifyAdminAuth, validateRequest({ body: uploadAvatarBodySchema }), asyncHandler(uploadMyAvatar));
adminsRouter.get("/", verifyAdminAuth, requireSuperAdmin, asyncHandler(getAdmins));
adminsRouter.post("/", verifyAdminAuth, requireSuperAdmin, validateRequest({ body: createAdminBodySchema }), asyncHandler(createAdmin));
adminsRouter.get("/:userId", verifyAdminAuth, requireSuperAdmin, validateRequest({ params: adminUserIdParamsSchema }), asyncHandler(getAdminById));
adminsRouter.put("/:userId", verifyAdminAuth, requireSuperAdmin, validateRequest({ params: adminUserIdParamsSchema, body: superAdminUpdateAdminBodySchema }), asyncHandler(patchAdmin));
adminsRouter.delete("/:userId", verifyAdminAuth, requireSuperAdmin, validateRequest({ params: adminUserIdParamsSchema }), asyncHandler(deleteAdmin));
export { adminsRouter };
