// File Summary: server/src/routes/adminForms.routes.ts
// Layer: routes
// Purpose: Exposes admin-prefixed forms and form-fields management endpoints.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
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
