// File: server/src/controllers/public.controller.ts
// Purpose: Handles HTTP request and response flow for public.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
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

function getParamValue(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] : value ?? "";
}
// Handles 'getPublicPrograms' workflow for this module.
export async function getPublicPrograms(req: Request, res: Response) {
    const result = await listPublicProgramsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'getPublicCohorts' workflow for this module.
export async function getPublicCohorts(req: Request, res: Response) {
    const result = await listPublicCohortsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'getPublicCohortApplicationForm' workflow for this module.
export async function getPublicCohortApplicationForm(req: Request, res: Response) {
    const data = await getPublicCohortApplicationFormService(Number(req.params.id));
    sendSuccess(res, data);
}
// Handles 'getPublicCohortById' workflow for this module.
export async function getPublicCohortById(req: Request, res: Response) {
    const data = await getPublicCohortDetailService(Number(req.params.id));
    sendSuccess(res, data);
}
// Handles 'getPublicApplyForm' workflow for this module.
export async function getPublicApplyForm(req: Request, res: Response) {
    const data = await getPublicApplyFormService();
    sendSuccess(res, data);
}
// Handles 'getPublicEvents' workflow for this module.
export async function getPublicEvents(req: Request, res: Response) {
    const result = await listPublicEventsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'getPublicEventBySlug' workflow for this module.
export async function getPublicEventBySlug(req: Request, res: Response) {
    const slug = getParamValue(req.params.slug);
    const data = await getPublicEventBySlugService(slug);
    sendSuccess(res, data);
}
// Handles 'getPublicAnnouncements' workflow for this module.
export async function getPublicAnnouncements(req: Request, res: Response) {
    const result = await listPublicAnnouncementsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'getPublicManagers' workflow for this module.
export async function getPublicManagers(req: Request, res: Response) {
    const result = await listPublicManagersService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'getPublicInstructors' workflow for this module.
export async function getPublicInstructors(req: Request, res: Response) {
    const result = await listPublicInstructorsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'getPublicStudents' workflow for this module.
export async function getPublicStudents(req: Request, res: Response) {
    const result = await listPublicStudentsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'getPublicStudentBySlug' workflow for this module.
export async function getPublicStudentBySlug(req: Request, res: Response) {
    const publicSlug = getParamValue(req.params.public_slug);
    const data = await getPublicStudentDetailService(publicSlug);
    sendSuccess(res, data);
}
// Handles 'getPublicTheme' workflow for this module.
export async function getPublicTheme(_req: Request, res: Response) {
    const data = await getPublicThemeService();
    sendSuccess(res, data);
}
// Handles 'getPublicHome' workflow for this module.
export async function getPublicHome(_req: Request, res: Response) {
    const data = await getPublicHomeService();
    sendSuccess(res, data);
}
// Handles 'getPublicPageByKey' workflow for this module.
export async function getPublicPageByKey(req: Request, res: Response) {
    const slug = getParamValue(req.params.slug);
    const data = await getPublicPageByKeyService(slug);
    sendSuccess(res, data);
}
// Handles 'submitPublicApply' workflow for this module.
export async function submitPublicApply(req: Request, res: Response) {
    const data = await submitPublicApplyService(req.body);
    sendSuccess(res, data, "Application submitted successfully.", 201);
}




