// File Summary: server/src/controllers/public.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { getPublicHomeService, getPublicThemeService, listPublicAnnouncementsService, listPublicCohortsService, listPublicEventsService, listPublicInstructorsService, listPublicManagersService, listPublicProgramsService, listPublicStudentsService, } from "../services/public.service.js";
export async function getPublicPrograms(req, res) {
    const result = await listPublicProgramsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicCohorts(req, res) {
    const result = await listPublicCohortsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicEvents(req, res) {
    const result = await listPublicEventsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicAnnouncements(req, res) {
    const result = await listPublicAnnouncementsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicManagers(req, res) {
    const result = await listPublicManagersService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicInstructors(req, res) {
    const result = await listPublicInstructorsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicStudents(req, res) {
    const result = await listPublicStudentsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicTheme(_req, res) {
    const data = await getPublicThemeService();
    sendSuccess(res, data);
}
export async function getPublicHome(_req, res) {
    const data = await getPublicHomeService();
    sendSuccess(res, data);
}


