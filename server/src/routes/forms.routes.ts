// File: server/src/routes/forms.routes.ts
// Purpose: Registers the Express routes for forms.
// It wires endpoint paths to middleware and controller handlers for this feature area.

import { Router } from "express";
import {
  getFormByIdWithFields,
  getCohortApplicationForm,
  getCohortForm,
  getFormCohorts,
  getGeneralForm,
  listForms,
  patchFormField,
  postForm,
  postFormField,
  postFormFieldsReorder,
  getProgramApplicationForm,
  patchForm,
  patchFormFields,
  patchProgramApplicationForm,
  patchProgramApplicationFormFields,
  removeFormField,
  putCohortForm,
  putGeneralForm,
  getProgramFormOptions,
  getProgramForm,
  putProgramForm,
} from "../controllers/forms.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  cohortFormPayloadSchema,
  formCreateSchema,
  formFieldCreateSchema,
  formFieldIdParamsSchema,
  formFieldUpdateSchema,
  formFieldsReorderSchema,
  formFieldsPatchSchema,
  formPatchPayloadSchema,
  formsListQuerySchema,
  formPayloadSchema,
  idParamsSchema,
  programApplicationFormFieldsPatchSchema,
  programApplicationFormPatchSchema,
} from "../schemas/forms.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const formsRouter = Router();

formsRouter.use(verifyAdminAuth);

// -- Named routes (must come before /:id) -------------------------------------

formsRouter.get("/", validateRequest({ query: formsListQuerySchema }), asyncHandler(listForms));
formsRouter.get("/general", asyncHandler(getGeneralForm));
formsRouter.put("/general", validateRequest({ body: formPayloadSchema }), asyncHandler(putGeneralForm));
formsRouter.get("/cohort-application", asyncHandler(getCohortApplicationForm));
formsRouter.get("/program-application", asyncHandler(getProgramApplicationForm));
formsRouter.post("/", validateRequest({ body: formCreateSchema }), asyncHandler(postForm));

formsRouter.patch("/form-fields", validateRequest({ body: formFieldsPatchSchema }), asyncHandler(patchFormFields));
formsRouter.patch(
  "/form-fields/:id",
  validateRequest({ params: formFieldIdParamsSchema, body: formFieldUpdateSchema }),
  asyncHandler(patchFormField),
);
formsRouter.delete(
  "/form-fields/:id",
  validateRequest({ params: formFieldIdParamsSchema }),
  asyncHandler(removeFormField),
);

formsRouter.patch(
  "/program-application",
  validateRequest({ body: programApplicationFormPatchSchema }),
  asyncHandler(patchProgramApplicationForm),
);
formsRouter.patch(
  "/program-application/fields",
  validateRequest({ body: programApplicationFormFieldsPatchSchema }),
  asyncHandler(patchProgramApplicationFormFields),
);

// Cohort form routes
formsRouter.get("/cohorts/options", asyncHandler(getFormCohorts));
formsRouter.get("/cohorts/:id", validateRequest({ params: idParamsSchema }), asyncHandler(getCohortForm));
formsRouter.put(
  "/cohorts/:id",
  validateRequest({ params: idParamsSchema, body: cohortFormPayloadSchema }),
  asyncHandler(putCohortForm),
);

// Program form routes
formsRouter.get("/programs/options", asyncHandler(getProgramFormOptions));
formsRouter.get("/programs/:id", validateRequest({ params: idParamsSchema }), asyncHandler(getProgramForm));
formsRouter.put(
  "/programs/:id",
  validateRequest({ params: idParamsSchema, body: cohortFormPayloadSchema }),
  asyncHandler(putProgramForm),
);

// -- Generic /:id routes (must come LAST) -------------------------------------

formsRouter.post(
  "/:id/fields",
  validateRequest({ params: idParamsSchema, body: formFieldCreateSchema }),
  asyncHandler(postFormField),
);
formsRouter.post(
  "/:id/fields/reorder",
  validateRequest({ params: idParamsSchema, body: formFieldsReorderSchema }),
  asyncHandler(postFormFieldsReorder),
);
formsRouter.get("/:id", validateRequest({ params: idParamsSchema }), asyncHandler(getFormByIdWithFields));
formsRouter.patch("/:id", validateRequest({ params: idParamsSchema, body: formPatchPayloadSchema }), asyncHandler(patchForm));

export { formsRouter };
