// File: server/src/controllers/forms.controller.ts
// Purpose: Handles HTTP request and response flow for forms.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  createFormFieldService,
  createFormService,
  deleteFormFieldByIdService,
  assignCohortFormService,
  getFormByIdWithFieldsService,
  getCohortApplicationFormService,
  getCohortFormService,
  getGeneralFormService,
  getProgramApplicationFormService,
  listFormsService,
  patchFormByIdService,
  patchFormFieldByIdService,
  patchFormFieldsService,
  patchProgramApplicationFormFieldsService,
  patchProgramApplicationFormService,
  reorderFormFieldsService,
  listFormCohortsService,
  listProgramFormOptionsService,
  getProgramFormService,
  saveCohortFormService,
  saveGeneralFormService,
  saveProgramFormService,
} from "../services/forms.service.js";

// Handles 'getGeneralForm' workflow for this module.
export async function getGeneralForm(_req: Request, res: Response) {
  const data = await getGeneralFormService();
  sendSuccess(res, data);
}

// Handles 'getCohortApplicationForm' workflow for this module.
export async function getCohortApplicationForm(_req: Request, res: Response) {
  const data = await getCohortApplicationFormService();
  sendSuccess(res, data);
}

// Handles 'putGeneralForm' workflow for this module.
export async function putGeneralForm(req: Request, res: Response) {
  const data = await saveGeneralFormService(req.user!.id, req.body);
  sendSuccess(res, data, "General form saved successfully.");
}

// Handles 'getFormCohorts' workflow for this module.
export async function getFormCohorts(_req: Request, res: Response) {
  const rows = await listFormCohortsService();
  sendList(res, rows, {
    page: 1,
    limit: rows.length,
    total: rows.length,
    totalPages: rows.length ? 1 : 0,
  });
}

// Handles 'getCohortForm' workflow for this module.
export async function getCohortForm(req: Request, res: Response) {
  const data = await getCohortFormService(Number(req.params.id));
  sendSuccess(res, data);
}

// Handles 'putCohortForm' workflow for this module.
export async function putCohortForm(req: Request, res: Response) {
  const data = await saveCohortFormService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Cohort form saved successfully.");
}

// Handles 'getProgramFormOptions' workflow for this module.
export async function getProgramFormOptions(_req: Request, res: Response) {
  const data = await listProgramFormOptionsService();
  sendSuccess(res, data);
}

// Handles 'getProgramForm' workflow for this module.
export async function getProgramForm(req: Request, res: Response) {
  const data = await getProgramFormService(Number(req.params.id));
  sendSuccess(res, data);
}

// Handles 'putProgramForm' workflow for this module.
export async function putProgramForm(req: Request, res: Response) {
  const data = await saveProgramFormService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data);
}

// Handles 'assignCohortForm' workflow for this module.
export async function assignCohortForm(req: Request, res: Response) {
  const data = await assignCohortFormService(Number(req.params.id), req.user!.id, req.body.mode);
  sendSuccess(res, data, "Cohort form assignment saved successfully.");
}

// Handles 'patchForm' workflow for this module.
export async function patchForm(req: Request, res: Response) {
  const data = await patchFormByIdService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Form updated successfully.");
}

// Handles 'patchFormFields' workflow for this module.
export async function patchFormFields(req: Request, res: Response) {
  const data = await patchFormFieldsService(req.body.form_id, req.body.fields, req.user!.id);
  sendSuccess(res, data, "Form fields updated successfully.");
}

// Handles 'getProgramApplicationForm' workflow for this module.
export async function getProgramApplicationForm(_req: Request, res: Response) {
  const data = await getProgramApplicationFormService();
  sendSuccess(res, data);
}

// Handles 'patchProgramApplicationForm' workflow for this module.
export async function patchProgramApplicationForm(req: Request, res: Response) {
  const data = await patchProgramApplicationFormService(req.user!.id, req.body);
  sendSuccess(res, data, "Program application form updated successfully.");
}

// Handles 'patchProgramApplicationFormFields' workflow for this module.
export async function patchProgramApplicationFormFields(req: Request, res: Response) {
  const data = await patchProgramApplicationFormFieldsService(req.user!.id, req.body.fields);
  sendSuccess(res, data, "Program application form fields updated successfully.");
}

// Handles 'listForms' workflow for this module.
export async function listForms(req: Request, res: Response) {
  const scope = typeof req.query.scope === "string" ? req.query.scope : undefined;
  const rows = await listFormsService(scope);
  sendList(res, rows, {
    page: 1,
    limit: rows.length,
    total: rows.length,
    totalPages: rows.length ? 1 : 0,
  });
}

// Handles 'getFormByIdWithFields' workflow for this module.
export async function getFormByIdWithFields(req: Request, res: Response) {
  const data = await getFormByIdWithFieldsService(Number(req.params.id));
  sendSuccess(res, data);
}

// Handles 'postForm' workflow for this module.
export async function postForm(req: Request, res: Response) {
  const data = await createFormService(req.user!.id, req.body);
  sendSuccess(res, data, "Form created successfully.", 201);
}

// Handles 'postFormField' workflow for this module.
export async function postFormField(req: Request, res: Response) {
  const data = await createFormFieldService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Form field created successfully.", 201);
}

// Handles 'patchFormField' workflow for this module.
export async function patchFormField(req: Request, res: Response) {
  const data = await patchFormFieldByIdService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Form field updated successfully.");
}

// Handles 'removeFormField' workflow for this module.
export async function removeFormField(req: Request, res: Response) {
  const data = await deleteFormFieldByIdService(Number(req.params.id), req.user!.id);
  sendSuccess(res, data, "Form field deleted successfully.");
}

// Handles 'postFormFieldsReorder' workflow for this module.
export async function postFormFieldsReorder(req: Request, res: Response) {
  const data = await reorderFormFieldsService(Number(req.params.id), req.body.orderedFieldIds, req.user!.id);
  sendSuccess(res, data, "Form fields reordered successfully.");
}





