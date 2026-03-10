// File: server/src/controllers/programApplications.controller.ts
// Purpose: Handles HTTP request and response flow for program applications.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
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

// Handles 'listProgramApplications' workflow for this module.
export async function listProgramApplications(req: Request, res: Response) {
  const result = await listProgramApplicationsService(req.query);
  sendList(res, result.data, result.pagination);
}

// Handles 'getProgramApplicationDetail' workflow for this module.
export async function getProgramApplicationDetail(req: Request, res: Response) {
  const data = await getProgramApplicationDetailService(Number(req.params.id));
  sendSuccess(res, data);
}

// Handles 'patchProgramApplicationStage' workflow for this module.
export async function patchProgramApplicationStage(req: Request, res: Response) {
  const data = await patchProgramApplicationStageService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Program application stage updated successfully.");
}

// Handles 'scheduleProgramApplicationInterview' workflow for this module.
export async function scheduleProgramApplicationInterview(req: Request, res: Response) {
  const data = await scheduleProgramApplicationInterviewService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Program application interview scheduled successfully.");
}

// Handles 'markProgramApplicationInterviewCompleted' workflow for this module.
export async function markProgramApplicationInterviewCompleted(req: Request, res: Response) {
  const data = await markProgramApplicationInterviewCompletedService(Number(req.params.id), req.user!.id);
  sendSuccess(res, data, "Program application interview marked completed.");
}

// Handles 'listProgramApplicationMessages' workflow for this module.
export async function listProgramApplicationMessages(req: Request, res: Response) {
  const data = await listProgramApplicationMessagesService(Number(req.params.id));
  sendSuccess(res, data);
}

// Handles 'createProgramApplicationMessage' workflow for this module.
export async function createProgramApplicationMessage(req: Request, res: Response) {
  const data = await createProgramApplicationMessageService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Program application message draft created.", 201);
}

// Handles 'sendProgramApplicationMessage' workflow for this module.
export async function sendProgramApplicationMessage(req: Request, res: Response) {
  const data = await sendProgramApplicationMessageService(Number(req.params.id), Number(req.params.messageId), req.user!.id);
  sendSuccess(res, data, "Program application message marked as sent.");
}

// Handles 'retryProgramApplicationMessage' workflow for this module.
export async function retryProgramApplicationMessage(req: Request, res: Response) {
  const data = await retryProgramApplicationMessageService(Number(req.params.messageId), req.user!.id);
  sendSuccess(res, data, "Program application message retried.");
}

// Handles 'decideProgramApplication' workflow for this module.
export async function decideProgramApplication(req: Request, res: Response) {
  const data = await decideProgramApplicationService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Program application decision saved successfully.");
}

// Handles 'confirmProgramApplicationParticipation' workflow for this module.
export async function confirmProgramApplicationParticipation(req: Request, res: Response) {
  const data = await confirmProgramApplicationParticipationService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Program application participation confirmed.");
}

// Handles 'createUserFromProgramApplication' workflow for this module.
export async function createUserFromProgramApplication(req: Request, res: Response) {
  const data = await createUserFromProgramApplicationService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "User created from program application.");
}





