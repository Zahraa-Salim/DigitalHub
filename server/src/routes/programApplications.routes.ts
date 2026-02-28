// File Summary: server/src/routes/programApplications.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import {
  confirmProgramApplicationParticipation,
  createProgramApplicationMessage,
  createUserFromProgramApplication,
  decideProgramApplication,
  getProgramApplicationDetail,
  listProgramApplicationMessages,
  listProgramApplications,
  markProgramApplicationInterviewCompleted,
  patchProgramApplicationStage,
  retryProgramApplicationMessage,
  scheduleProgramApplicationInterview,
  sendProgramApplicationMessage,
} from "../controllers/programApplications.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  programApplicationCreateUserSchema,
  programApplicationDecisionSchema,
  programApplicationIdParamsSchema,
  programApplicationInterviewCompleteSchema,
  programApplicationInterviewScheduleSchema,
  programApplicationMessageCreateSchema,
  programApplicationMessageParamsSchema,
  programApplicationRetryMessageParamsSchema,
  programApplicationMessageSendBodySchema,
  programApplicationParticipationConfirmSchema,
  programApplicationsListQuerySchema,
  programApplicationStagePatchSchema,
} from "../schemas/programApplications.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const programApplicationsRouter = Router();

programApplicationsRouter.use(verifyAdminAuth);

programApplicationsRouter.get("/", validateRequest({ query: programApplicationsListQuerySchema }), asyncHandler(listProgramApplications));
programApplicationsRouter.get(
  "/:id",
  validateRequest({ params: programApplicationIdParamsSchema }),
  asyncHandler(getProgramApplicationDetail),
);
programApplicationsRouter.patch(
  "/:id/stage",
  validateRequest({ params: programApplicationIdParamsSchema, body: programApplicationStagePatchSchema }),
  asyncHandler(patchProgramApplicationStage),
);
programApplicationsRouter.patch(
  "/:id/status",
  validateRequest({ params: programApplicationIdParamsSchema, body: programApplicationStagePatchSchema }),
  asyncHandler(patchProgramApplicationStage),
);
programApplicationsRouter.post(
  "/:id/interview",
  validateRequest({ params: programApplicationIdParamsSchema, body: programApplicationInterviewScheduleSchema }),
  asyncHandler(scheduleProgramApplicationInterview),
);
programApplicationsRouter.post(
  "/:id/interview/schedule",
  validateRequest({ params: programApplicationIdParamsSchema, body: programApplicationInterviewScheduleSchema }),
  asyncHandler(scheduleProgramApplicationInterview),
);
programApplicationsRouter.post(
  "/:id/interview/mark-completed",
  validateRequest({ params: programApplicationIdParamsSchema, body: programApplicationInterviewCompleteSchema }),
  asyncHandler(markProgramApplicationInterviewCompleted),
);
programApplicationsRouter.get(
  "/:id/messages",
  validateRequest({ params: programApplicationIdParamsSchema }),
  asyncHandler(listProgramApplicationMessages),
);
programApplicationsRouter.post(
  "/:id/messages",
  validateRequest({ params: programApplicationIdParamsSchema, body: programApplicationMessageCreateSchema }),
  asyncHandler(createProgramApplicationMessage),
);
programApplicationsRouter.post(
  "/:id/messages/:messageId/send",
  validateRequest({ params: programApplicationMessageParamsSchema, body: programApplicationMessageSendBodySchema }),
  asyncHandler(sendProgramApplicationMessage),
);
programApplicationsRouter.post(
  "/messages/:messageId/retry",
  validateRequest({ params: programApplicationRetryMessageParamsSchema, body: programApplicationMessageSendBodySchema }),
  asyncHandler(retryProgramApplicationMessage),
);
programApplicationsRouter.post(
  "/:id/decision",
  validateRequest({ params: programApplicationIdParamsSchema, body: programApplicationDecisionSchema }),
  asyncHandler(decideProgramApplication),
);
programApplicationsRouter.post(
  "/:id/participation/confirm",
  validateRequest({ params: programApplicationIdParamsSchema, body: programApplicationParticipationConfirmSchema }),
  asyncHandler(confirmProgramApplicationParticipation),
);
programApplicationsRouter.post(
  "/:id/create-user",
  validateRequest({ params: programApplicationIdParamsSchema, body: programApplicationCreateUserSchema }),
  asyncHandler(createUserFromProgramApplication),
);

export { programApplicationsRouter };
