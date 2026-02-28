// File Summary: server/src/routes/admins.routes.ts
// Layer: routes
// Purpose: Wires super-admin-only admin management endpoints.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck

import { Router } from "express";
import {
  activateAdmin,
  deactivateAdmin,
  getAdmins,
  patchAdmin,
  postAdmin,
} from "../controllers/admins.controller.js";
import { verifySuperAdminAuth } from "../middleware/verifySuperAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  adminCreateSchema,
  adminPatchSchema,
  adminUserIdParamsSchema,
  emptyBodySchema,
} from "../schemas/admins.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const adminsRouter = Router();

adminsRouter.use(verifySuperAdminAuth);
adminsRouter.get("/", asyncHandler(getAdmins));
adminsRouter.post("/", validateRequest({ body: adminCreateSchema }), asyncHandler(postAdmin));
adminsRouter.patch(
  "/:userId",
  validateRequest({ params: adminUserIdParamsSchema, body: adminPatchSchema }),
  asyncHandler(patchAdmin),
);
adminsRouter.post(
  "/:userId/deactivate",
  validateRequest({ params: adminUserIdParamsSchema, body: emptyBodySchema }),
  asyncHandler(deactivateAdmin),
);
adminsRouter.post(
  "/:userId/activate",
  validateRequest({ params: adminUserIdParamsSchema, body: emptyBodySchema }),
  asyncHandler(activateAdmin),
);

export { adminsRouter };
