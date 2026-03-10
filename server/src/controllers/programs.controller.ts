// File: server/src/controllers/programs.controller.ts
// Purpose: Handles HTTP request and response flow for programs.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { assignInstructorService, closeCohortService, createCohortService, createProgramService, deleteCohortService, deleteProgramService, listCohortInstructorsService, listCohortsService, listProgramsService, openCohortService, patchCohortService, patchProgramService, unassignInstructorService, uploadProgramImageService, } from "../services/programs.service.js";
// Handles 'createProgram' workflow for this module.
export async function createProgram(req: Request, res: Response) {
    const data = await createProgramService(req.user!.id, req.body);
    sendSuccess(res, data, "Program created successfully.", 201);
}
// Handles 'getPrograms' workflow for this module.
export async function getPrograms(req: Request, res: Response) {
    const result = await listProgramsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'patchProgram' workflow for this module.
export async function patchProgram(req: Request, res: Response) {
    const data = await patchProgramService(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Program updated successfully.");
}
// Handles 'deleteProgram' workflow for this module.
export async function deleteProgram(req: Request, res: Response) {
    const data = await deleteProgramService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Program deleted successfully.");
}
// Handles 'createCohort' workflow for this module.
export async function createCohort(req: Request, res: Response) {
    const data = await createCohortService(req.user!.id, req.body);
    sendSuccess(res, data, "Cohort created successfully.", 201);
}
// Handles 'getCohorts' workflow for this module.
export async function getCohorts(req: Request, res: Response) {
    const result = await listCohortsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'patchCohort' workflow for this module.
export async function patchCohort(req: Request, res: Response) {
    const data = await patchCohortService(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Cohort updated successfully.");
}
// Handles 'deleteCohort' workflow for this module.
export async function deleteCohort(req: Request, res: Response) {
    const data = await deleteCohortService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Cohort deleted successfully.");
}
// Handles 'openCohort' workflow for this module.
export async function openCohort(req: Request, res: Response) {
    const data = await openCohortService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Cohort opened successfully.");
}
// Handles 'closeCohort' workflow for this module.
export async function closeCohort(req: Request, res: Response) {
    const data = await closeCohortService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Cohort closed successfully.");
}
// Handles 'getCohortInstructors' workflow for this module.
export async function getCohortInstructors(req: Request, res: Response) {
    const result = await listCohortInstructorsService(Number(req.params.id), req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'assignCohortInstructor' workflow for this module.
export async function assignCohortInstructor(req: Request, res: Response) {
    const body = req.body;
    const data = await assignInstructorService(Number(req.params.id), req.user!.id, body);
    sendSuccess(res, data, "Instructor assigned successfully.", 201);
}
// Handles 'unassignCohortInstructor' workflow for this module.
export async function unassignCohortInstructor(req: Request, res: Response) {
    const data = await unassignInstructorService(Number(req.params.id), Number(req.params.instructorUserId), req.user!.id);
    sendSuccess(res, data, "Instructor unassigned successfully.");
}
// Handles 'postProgramImage' workflow for this module.
export async function postProgramImage(req: Request, res: Response) {
    const data = await uploadProgramImageService(req.user!.id, req.body);
    sendSuccess(res, data, "Program image uploaded successfully.", 201);
}





