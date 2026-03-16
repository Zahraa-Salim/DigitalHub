// File: server/src/routes/adminForms.routes.ts
// Purpose: Registers the Express routes for admin forms.
// It wires endpoint paths to middleware and controller handlers for this feature area.

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

