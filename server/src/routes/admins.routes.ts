// File: server/src/routes/admins.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
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
