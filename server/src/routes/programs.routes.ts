// File: server/src/routes/programs.routes.ts
// Purpose: Registers the Express routes for programs.
// It wires endpoint paths to middleware and controller handlers for this feature area.

import { Router } from "express";
import { assignCohortForm } from "../controllers/forms.controller.js";
import { assignCohortInstructor, closeCohort, createCohort, createProgram, deleteCohort, deleteProgram, getCohortEnrollments, getCohortInstructors, getCohorts, getPrograms, openCohort, patchCohort, patchProgram, postProgramImage, unassignCohortInstructor, } from "../controllers/programs.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { cohortFormAssignBodySchema } from "../schemas/forms.schemas.js";
import { cohortCreateSchema, cohortInstructorBodySchema, cohortInstructorParamsSchema, cohortPatchSchema, idParamsSchema, programCreateSchema, programImageUploadSchema, programPatchSchema, } from "../schemas/programs.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const programsRouter = Router();
programsRouter.post("/programs", verifyAdminAuth, validateRequest({ body: programCreateSchema }), asyncHandler(createProgram));
programsRouter.post("/programs/image", verifyAdminAuth, validateRequest({ body: programImageUploadSchema }), asyncHandler(postProgramImage));
programsRouter.get("/programs", verifyAdminAuth, asyncHandler(getPrograms));
programsRouter.patch("/programs/:id", verifyAdminAuth, validateRequest({ params: idParamsSchema, body: programPatchSchema }), asyncHandler(patchProgram));
programsRouter.delete("/programs/:id", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(deleteProgram));
programsRouter.post("/cohorts", verifyAdminAuth, validateRequest({ body: cohortCreateSchema }), asyncHandler(createCohort));
programsRouter.get("/cohorts", verifyAdminAuth, asyncHandler(getCohorts));
programsRouter.patch("/cohorts/:id", verifyAdminAuth, validateRequest({ params: idParamsSchema, body: cohortPatchSchema }), asyncHandler(patchCohort));
programsRouter.post("/cohorts/:id/form/assign", verifyAdminAuth, validateRequest({ params: idParamsSchema, body: cohortFormAssignBodySchema }), asyncHandler(assignCohortForm));
programsRouter.delete("/cohorts/:id", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(deleteCohort));
programsRouter.post("/cohorts/:id/open", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(openCohort));
programsRouter.post("/cohorts/:id/close", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(closeCohort));
programsRouter.get("/cohorts/:id/instructors", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(getCohortInstructors));
programsRouter.get("/cohorts/:id/enrollments", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(getCohortEnrollments));
programsRouter.post("/cohorts/:id/instructors", verifyAdminAuth, validateRequest({ params: idParamsSchema, body: cohortInstructorBodySchema }), asyncHandler(assignCohortInstructor));
programsRouter.delete("/cohorts/:id/instructors/:instructorUserId", verifyAdminAuth, validateRequest({ params: cohortInstructorParamsSchema }), asyncHandler(unassignCohortInstructor));
export { programsRouter };

