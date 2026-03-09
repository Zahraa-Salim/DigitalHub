// File: server/src/routes/adminForms.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
// @ts-nocheck
import { Router } from "express";
import {
  patchFormField,
  removeFormField,
} from "../controllers/forms.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  formFieldIdParamsSchema,
  formFieldUpdateSchema,
} from "../schemas/forms.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const adminFormsRouter = Router();

adminFormsRouter.use(verifyAdminAuth);
adminFormsRouter.patch(
  "/form-fields/:id",
  validateRequest({ params: formFieldIdParamsSchema, body: formFieldUpdateSchema }),
  asyncHandler(patchFormField),
);
adminFormsRouter.delete(
  "/form-fields/:id",
  validateRequest({ params: formFieldIdParamsSchema }),
  asyncHandler(removeFormField),
);

export { adminFormsRouter };
