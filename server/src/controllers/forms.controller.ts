// File Summary: server/src/controllers/forms.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  getCohortFormService,
  getGeneralFormService,
  listFormCohortsService,
  saveCohortFormService,
  saveGeneralFormService,
} from "../services/forms.service.js";

export async function getGeneralForm(_req, res) {
  const data = await getGeneralFormService();
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
