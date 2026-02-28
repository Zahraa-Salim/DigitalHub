// File Summary: server/src/routes/public.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import {
  confirmInterviewByToken,
  confirmInterviewByTokenLink,
  confirmParticipationByToken,
  confirmParticipationByTokenLink,
  rescheduleInterviewByToken,
  rescheduleInterviewByTokenLink,
} from "../controllers/applications.controller.js";
import { getPublicAnnouncements, getPublicCohorts, getPublicEvents, getPublicHome, getPublicInstructors, getPublicManagers, getPublicPrograms, getPublicStudentBySlug, getPublicStudents, getPublicTheme, submitPublicApply, } from "../controllers/public.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  interviewTokenParamsSchema,
  publicApplyBodySchema,
  publicInterviewConfirmBodySchema,
  publicInterviewRescheduleBodySchema,
  publicParticipationConfirmBodySchema,
} from "../schemas/applications.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const publicRouter = Router();
publicRouter.get("/theme", asyncHandler(getPublicTheme));
publicRouter.get("/home", asyncHandler(getPublicHome));
publicRouter.post("/apply", validateRequest({ body: publicApplyBodySchema }), asyncHandler(submitPublicApply));
publicRouter.get("/programs", asyncHandler(getPublicPrograms));
publicRouter.get("/cohorts", asyncHandler(getPublicCohorts));
publicRouter.get("/events", asyncHandler(getPublicEvents));
publicRouter.get("/announcements", asyncHandler(getPublicAnnouncements));
publicRouter.get("/managers", asyncHandler(getPublicManagers));
publicRouter.get("/instructors", asyncHandler(getPublicInstructors));
publicRouter.get("/students", asyncHandler(getPublicStudents));
publicRouter.get("/students/:public_slug", asyncHandler(getPublicStudentBySlug));
publicRouter.get("/interviews/:token/confirm", validateRequest({ params: interviewTokenParamsSchema }), asyncHandler(confirmInterviewByTokenLink));
publicRouter.get("/interviews/:token/reschedule", validateRequest({ params: interviewTokenParamsSchema }), asyncHandler(rescheduleInterviewByTokenLink));
publicRouter.post("/interviews/:token/confirm", validateRequest({ params: interviewTokenParamsSchema, body: publicInterviewConfirmBodySchema }), asyncHandler(confirmInterviewByToken));
publicRouter.post("/interviews/:token/reschedule", validateRequest({ params: interviewTokenParamsSchema, body: publicInterviewRescheduleBodySchema }), asyncHandler(rescheduleInterviewByToken));
publicRouter.get("/participation/:token/confirm", validateRequest({ params: interviewTokenParamsSchema }), asyncHandler(confirmParticipationByTokenLink));
publicRouter.post("/participation/:token/confirm", validateRequest({ params: interviewTokenParamsSchema, body: publicParticipationConfirmBodySchema }), asyncHandler(confirmParticipationByToken));
export { publicRouter };


