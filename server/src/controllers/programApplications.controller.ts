// File Summary: server/src/controllers/programApplications.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  confirmProgramApplicationParticipationService,
  createProgramApplicationMessageService,
  createUserFromProgramApplicationService,
  decideProgramApplicationService,
  getProgramApplicationDetailService,
  listProgramApplicationMessagesService,
  listProgramApplicationsService,
  markProgramApplicationInterviewCompletedService,
  patchProgramApplicationStageService,
  retryProgramApplicationMessageService,
  scheduleProgramApplicationInterviewService,
  sendProgramApplicationMessageService,
} from "../services/programApplications.service.js";

export async function listProgramApplications(req, res) {
  const result = await listProgramApplicationsService(req.query);
  sendList(res, result.data, result.pagination);
}

export async function getProgramApplicationDetail(req, res) {
  const data = await getProgramApplicationDetailService(Number(req.params.id));
  sendSuccess(res, data);
}

export async function patchProgramApplicationStage(req, res) {
  const data = await patchProgramApplicationStageService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Program application stage updated successfully.");
}

export async function scheduleProgramApplicationInterview(req, res) {
  const data = await scheduleProgramApplicationInterviewService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Program application interview scheduled successfully.");
}

export async function markProgramApplicationInterviewCompleted(req, res) {
  const data = await markProgramApplicationInterviewCompletedService(Number(req.params.id), req.user.id);
  sendSuccess(res, data, "Program application interview marked completed.");
}

export async function listProgramApplicationMessages(req, res) {
  const data = await listProgramApplicationMessagesService(Number(req.params.id));
  sendSuccess(res, data);
}

export async function createProgramApplicationMessage(req, res) {
  const data = await createProgramApplicationMessageService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Program application message draft created.", 201);
}

export async function sendProgramApplicationMessage(req, res) {
  const data = await sendProgramApplicationMessageService(Number(req.params.id), Number(req.params.messageId), req.user.id);
  sendSuccess(res, data, "Program application message marked as sent.");
}

export async function retryProgramApplicationMessage(req, res) {
  const data = await retryProgramApplicationMessageService(Number(req.params.messageId), req.user.id);
  sendSuccess(res, data, "Program application message retried.");
}

export async function decideProgramApplication(req, res) {
  const data = await decideProgramApplicationService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Program application decision saved successfully.");
}

export async function confirmProgramApplicationParticipation(req, res) {
  const data = await confirmProgramApplicationParticipationService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Program application participation confirmed.");
}

export async function createUserFromProgramApplication(req, res) {
  const data = await createUserFromProgramApplicationService(Number(req.params.id), req.user.id);
  sendSuccess(res, data, "User created from program application.");
}
