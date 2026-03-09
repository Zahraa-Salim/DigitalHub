// File: server/src/controllers/public.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
    getPublicCohortApplicationFormService,
    getPublicCohortDetailService,
    getPublicEventBySlugService,
    getPublicApplyFormService,
    getPublicHomeService,
    getPublicPageByKeyService,
    getPublicStudentDetailService,
    getPublicThemeService,
    listPublicAnnouncementsService,
    listPublicCohortsService,
    listPublicEventsService,
    listPublicInstructorsService,
    listPublicManagersService,
    listPublicProgramsService,
    listPublicStudentsService,
    submitPublicApplyService,
} from "../services/public.service.js";
export async function getPublicPrograms(req, res) {
    const result = await listPublicProgramsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicCohorts(req, res) {
    const result = await listPublicCohortsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicCohortApplicationForm(req, res) {
    const data = await getPublicCohortApplicationFormService(Number(req.params.id));
    sendSuccess(res, data);
}
export async function getPublicCohortById(req, res) {
    const data = await getPublicCohortDetailService(Number(req.params.id));
    sendSuccess(res, data);
}
export async function getPublicApplyForm(req, res) {
    const data = await getPublicApplyFormService();
    sendSuccess(res, data);
}
export async function getPublicEvents(req, res) {
    const result = await listPublicEventsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function getPublicEventBySlug(req, res) {
    const data = await getPublicEventBySlugService(req.params.slug);
    sendSuccess(res, data);
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
export async function getPublicStudentBySlug(req, res) {
    const data = await getPublicStudentDetailService(String(req.params.public_slug));
    sendSuccess(res, data);
}
export async function getPublicTheme(_req, res) {
    const data = await getPublicThemeService();
    sendSuccess(res, data);
}
export async function getPublicHome(_req, res) {
    const data = await getPublicHomeService();
    sendSuccess(res, data);
}
export async function getPublicPageByKey(req, res) {
    const data = await getPublicPageByKeyService(req.params.slug);
    sendSuccess(res, data);
}
export async function submitPublicApply(req, res) {
    const data = await submitPublicApplyService(req.body);
    sendSuccess(res, data, "Application submitted successfully.", 201);
}


