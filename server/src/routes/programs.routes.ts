// File Summary: server/src/routes/programs.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { assignCohortInstructor, closeCohort, createCohort, createProgram, deleteCohort, deleteProgram, getCohortInstructors, getCohorts, getPrograms, openCohort, patchCohort, patchProgram, } from "../controllers/programs.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { cohortCreateSchema, cohortInstructorBodySchema, cohortPatchSchema, idParamsSchema, programCreateSchema, programPatchSchema, } from "../schemas/programs.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const programsRouter = Router();
programsRouter.post("/programs", verifyAdminAuth, validateRequest({ body: programCreateSchema }), asyncHandler(createProgram));
programsRouter.get("/programs", verifyAdminAuth, asyncHandler(getPrograms));
programsRouter.patch("/programs/:id", verifyAdminAuth, validateRequest({ params: idParamsSchema, body: programPatchSchema }), asyncHandler(patchProgram));
programsRouter.delete("/programs/:id", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(deleteProgram));
programsRouter.post("/cohorts", verifyAdminAuth, validateRequest({ body: cohortCreateSchema }), asyncHandler(createCohort));
programsRouter.get("/cohorts", verifyAdminAuth, asyncHandler(getCohorts));
programsRouter.patch("/cohorts/:id", verifyAdminAuth, validateRequest({ params: idParamsSchema, body: cohortPatchSchema }), asyncHandler(patchCohort));
programsRouter.delete("/cohorts/:id", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(deleteCohort));
programsRouter.post("/cohorts/:id/open", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(openCohort));
programsRouter.post("/cohorts/:id/close", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(closeCohort));
programsRouter.get("/cohorts/:id/instructors", verifyAdminAuth, validateRequest({ params: idParamsSchema }), asyncHandler(getCohortInstructors));
programsRouter.post("/cohorts/:id/instructors", verifyAdminAuth, validateRequest({ params: idParamsSchema, body: cohortInstructorBodySchema }), asyncHandler(assignCohortInstructor));
export { programsRouter };


