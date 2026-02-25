// File Summary: server/src/routes/forms.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import {
  getCohortForm,
  getFormCohorts,
  getGeneralForm,
  putCohortForm,
  putGeneralForm,
} from "../controllers/forms.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { cohortFormPayloadSchema, formPayloadSchema, idParamsSchema } from "../schemas/forms.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const formsRouter = Router();

formsRouter.use(verifyAdminAuth);
formsRouter.get("/general", asyncHandler(getGeneralForm));
formsRouter.put("/general", validateRequest({ body: formPayloadSchema }), asyncHandler(putGeneralForm));
formsRouter.get("/cohorts/options", asyncHandler(getFormCohorts));
formsRouter.get("/cohorts/:id", validateRequest({ params: idParamsSchema }), asyncHandler(getCohortForm));
formsRouter.put(
  "/cohorts/:id",
  validateRequest({ params: idParamsSchema, body: cohortFormPayloadSchema }),
  asyncHandler(putCohortForm),
);

export { formsRouter };
