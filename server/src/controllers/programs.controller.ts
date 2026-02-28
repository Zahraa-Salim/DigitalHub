// File Summary: server/src/controllers/programs.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { assignInstructorService, closeCohortService, createCohortService, createProgramService, deleteCohortService, deleteProgramService, listCohortInstructorsService, listCohortsService, listProgramsService, openCohortService, patchCohortService, patchProgramService, } from "../services/programs.service.js";
export async function createProgram(req, res) {
    const data = await createProgramService(req.user.id, req.body);
    sendSuccess(res, data, "Program created successfully.", 201);
}
export async function getPrograms(req, res) {
    const result = await listProgramsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function patchProgram(req, res) {
    const data = await patchProgramService(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Program updated successfully.");
}
export async function deleteProgram(req, res) {
    const data = await deleteProgramService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Program deleted successfully.");
}
export async function createCohort(req, res) {
    const data = await createCohortService(req.user.id, req.body);
    sendSuccess(res, data, "Cohort created successfully.", 201);
}
export async function getCohorts(req, res) {
    const result = await listCohortsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function patchCohort(req, res) {
    const data = await patchCohortService(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Cohort updated successfully.");
}
export async function deleteCohort(req, res) {
    const data = await deleteCohortService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Cohort deleted successfully.");
}
export async function openCohort(req, res) {
    const data = await openCohortService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Cohort opened successfully.");
}
export async function closeCohort(req, res) {
    const data = await closeCohortService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Cohort closed successfully.");
}
export async function getCohortInstructors(req, res) {
    const result = await listCohortInstructorsService(Number(req.params.id), req.query);
    sendList(res, result.data, result.pagination);
}
export async function assignCohortInstructor(req, res) {
    const body = req.body;
    const data = await assignInstructorService(Number(req.params.id), req.user.id, body);
    sendSuccess(res, data, "Instructor assigned successfully.", 201);
}


