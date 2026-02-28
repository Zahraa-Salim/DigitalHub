// File Summary: server/src/controllers/forms.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
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
  saveCohortFormService,
  saveGeneralFormService,
} from "../services/forms.service.js";

export async function getGeneralForm(_req, res) {
  const data = await getGeneralFormService();
  sendSuccess(res, data);
}

export async function getCohortApplicationForm(_req, res) {
  const data = await getCohortApplicationFormService();
  sendSuccess(res, data);
}

export async function putGeneralForm(req, res) {
  const data = await saveGeneralFormService(req.user.id, req.body);
  sendSuccess(res, data, "General form saved successfully.");
}

export async function getFormCohorts(_req, res) {
  const rows = await listFormCohortsService();
  sendList(res, rows, {
    page: 1,
    limit: rows.length,
    total: rows.length,
    totalPages: rows.length ? 1 : 0,
  });
}

export async function getCohortForm(req, res) {
  const data = await getCohortFormService(Number(req.params.id));
  sendSuccess(res, data);
}

export async function putCohortForm(req, res) {
  const data = await saveCohortFormService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Cohort form saved successfully.");
}

export async function assignCohortForm(req, res) {
  const data = await assignCohortFormService(Number(req.params.id), req.user.id, req.body.mode);
  sendSuccess(res, data, "Cohort form assignment saved successfully.");
}

export async function patchForm(req, res) {
  const data = await patchFormByIdService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Form updated successfully.");
}

export async function patchFormFields(req, res) {
  const data = await patchFormFieldsService(req.body.form_id, req.body.fields, req.user.id);
  sendSuccess(res, data, "Form fields updated successfully.");
}

export async function getProgramApplicationForm(_req, res) {
  const data = await getProgramApplicationFormService();
  sendSuccess(res, data);
}

export async function patchProgramApplicationForm(req, res) {
  const data = await patchProgramApplicationFormService(req.user.id, req.body);
  sendSuccess(res, data, "Program application form updated successfully.");
}

export async function patchProgramApplicationFormFields(req, res) {
  const data = await patchProgramApplicationFormFieldsService(req.user.id, req.body.fields);
  sendSuccess(res, data, "Program application form fields updated successfully.");
}

export async function listForms(req, res) {
  const rows = await listFormsService(req.query.scope);
  sendList(res, rows, {
    page: 1,
    limit: rows.length,
    total: rows.length,
    totalPages: rows.length ? 1 : 0,
  });
}

export async function getFormByIdWithFields(req, res) {
  const data = await getFormByIdWithFieldsService(Number(req.params.id));
  sendSuccess(res, data);
}

export async function postForm(req, res) {
  const data = await createFormService(req.user.id, req.body);
  sendSuccess(res, data, "Form created successfully.", 201);
}

export async function postFormField(req, res) {
  const data = await createFormFieldService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Form field created successfully.", 201);
}

export async function patchFormField(req, res) {
  const data = await patchFormFieldByIdService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Form field updated successfully.");
}

export async function removeFormField(req, res) {
  const data = await deleteFormFieldByIdService(Number(req.params.id), req.user.id);
  sendSuccess(res, data, "Form field deleted successfully.");
}

export async function postFormFieldsReorder(req, res) {
  const data = await reorderFormFieldsService(Number(req.params.id), req.body.orderedFieldIds, req.user.id);
  sendSuccess(res, data, "Form fields reordered successfully.");
}
