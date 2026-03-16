// File: server/src/routes/public.routes.ts
// Purpose: Registers the Express routes for public.
// It wires endpoint paths to middleware and controller handlers for this feature area.

import { Router } from "express";
import {
  confirmInterviewByToken,
  confirmInterviewByTokenLink,
  confirmParticipationByToken,
  confirmParticipationByTokenLink,
  rescheduleInterviewByToken,
  rescheduleInterviewByTokenLink,
} from "../controllers/applications.controller.js";
import {
  getPublicAnnouncements,
  getPublicApplyForm,
  getPublicGeneralForm,
  getPublicCohortApplicationForm,
  getPublicCohortById,
  getPublicCohorts,
  getPublicEventBySlug,
  getPublicEvents,
  getPublicHome,
  getPublicInstructors,
  getPublicManagers,
  getPublicPageByKey,
  getPublicProgramApplicationForm,
  getPublicPrograms,
  getPublicStudentBySlug,
  getPublicStudents,
  submitPublicCohortApply,
  getPublicTheme,
  submitPublicApply,
} from "../controllers/public.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { idParamsSchema } from "../schemas/programs.schemas.js";
import { eventSlugParamsSchema } from "../schemas/events.schemas.js";
import {
  interviewTokenParamsSchema,
  publicApplyBodySchema,
  publicCohortApplyBodySchema,
  publicInterviewConfirmBodySchema,
  publicInterviewRescheduleBodySchema,
  publicParticipationConfirmBodySchema,
} from "../schemas/applications.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const publicRouter = Router();
publicRouter.get("/theme", asyncHandler(getPublicTheme));
publicRouter.get("/home", asyncHandler(getPublicHome));
publicRouter.get("/pages/:slug", validateRequest({ params: eventSlugParamsSchema }), asyncHandler(getPublicPageByKey));
publicRouter.get("/apply/form", asyncHandler(getPublicApplyForm));
publicRouter.get("/forms/general", asyncHandler(getPublicGeneralForm));
publicRouter.get("/forms/program/:id", validateRequest({ params: idParamsSchema }), asyncHandler(getPublicProgramApplicationForm));
publicRouter.get("/forms/programs/:id", validateRequest({ params: idParamsSchema }), asyncHandler(getPublicProgramApplicationForm));
publicRouter.post("/apply", validateRequest({ body: publicApplyBodySchema }), asyncHandler(submitPublicApply));
publicRouter.get("/programs", asyncHandler(getPublicPrograms));
publicRouter.get("/cohorts", asyncHandler(getPublicCohorts));
publicRouter.post(
  "/cohorts/:id/apply",
  validateRequest({ params: idParamsSchema, body: publicCohortApplyBodySchema }),
  asyncHandler(submitPublicCohortApply),
);
publicRouter.get(
  "/cohorts/:id",
  validateRequest({ params: idParamsSchema }),
  asyncHandler(getPublicCohortById),
);
publicRouter.get(
  "/cohorts/:id/form",
  validateRequest({ params: idParamsSchema }),
  asyncHandler(getPublicCohortApplicationForm),
);
publicRouter.get("/events", asyncHandler(getPublicEvents));
publicRouter.get("/events/:slug", validateRequest({ params: eventSlugParamsSchema }), asyncHandler(getPublicEventBySlug));
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

