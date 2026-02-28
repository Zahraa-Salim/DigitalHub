// File Summary: server/src/routes/applications.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import {
  approveApplication,
  confirmParticipation,
  createApplication,
  createUserFromApplication,
  getApplicationMessages,
  getApplicationPipeline,
  getApplications,
  markInterviewCompleted,
  patchApplicationStage,
  postApplicationMessage,
  rejectApplication,
  scheduleInterview,
  sendApplicationMessage,
  setApplicationDecision,
  shortlistApplication,
} from "../controllers/applications.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  applicationCreateSchema,
  approveBodySchema,
  createUserBodySchema,
  decisionBodySchema,
  idParamsSchema,
  interviewCompleteBodySchema,
  interviewScheduleBodySchema,
  messageCreateBodySchema,
  messageIdParamsSchema,
  participationConfirmBodySchema,
  rejectBodySchema,
  shortlistBodySchema,
  stagePatchBodySchema,
} from "../schemas/applications.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const applicationsRouter = Router();
applicationsRouter.post("/", rateLimit({
    keyPrefix: "rl:public:applications",
    windowSec: 600,
    max: 5,
}), validateRequest({ body: applicationCreateSchema }), asyncHandler(createApplication));
applicationsRouter.use(verifyAdminAuth);
applicationsRouter.get("/", asyncHandler(getApplications));
applicationsRouter.get("/:id/pipeline", validateRequest({ params: idParamsSchema }), asyncHandler(getApplicationPipeline));
applicationsRouter.get("/:id/messages", validateRequest({ params: idParamsSchema }), asyncHandler(getApplicationMessages));
applicationsRouter.post("/:id/messages", validateRequest({ params: idParamsSchema, body: messageCreateBodySchema }), asyncHandler(postApplicationMessage));
applicationsRouter.post("/:id/messages/:messageId/send", validateRequest({ params: messageIdParamsSchema, body: shortlistBodySchema }), asyncHandler(sendApplicationMessage));
applicationsRouter.patch("/:id/stage", validateRequest({ params: idParamsSchema, body: stagePatchBodySchema }), asyncHandler(patchApplicationStage));
applicationsRouter.post("/:id/shortlist", validateRequest({ params: idParamsSchema, body: shortlistBodySchema }), asyncHandler(shortlistApplication));
applicationsRouter.post("/:id/interview/schedule", validateRequest({ params: idParamsSchema, body: interviewScheduleBodySchema }), asyncHandler(scheduleInterview));
applicationsRouter.post("/:id/interview/mark-completed", validateRequest({ params: idParamsSchema, body: interviewCompleteBodySchema }), asyncHandler(markInterviewCompleted));
applicationsRouter.post("/:id/decision", validateRequest({ params: idParamsSchema, body: decisionBodySchema }), asyncHandler(setApplicationDecision));
applicationsRouter.post("/:id/participation/confirm", validateRequest({ params: idParamsSchema, body: participationConfirmBodySchema }), asyncHandler(confirmParticipation));
applicationsRouter.post("/:id/create-user", validateRequest({ params: idParamsSchema, body: createUserBodySchema }), asyncHandler(createUserFromApplication));
applicationsRouter.patch("/:id/approve", validateRequest({ params: idParamsSchema, body: approveBodySchema }), asyncHandler(approveApplication));
applicationsRouter.patch("/:id/reject", validateRequest({ params: idParamsSchema, body: rejectBodySchema }), asyncHandler(rejectApplication));
export { applicationsRouter };


