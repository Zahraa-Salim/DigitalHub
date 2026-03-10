// File: server/src/controllers/cms.controller.ts
// Purpose: Handles HTTP request and response flow for CMS.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createCmsThemeToken, getCmsSiteSettings, listCmsHomeSections, listCmsMedia, listCmsPages, listCmsThemeTokens, patchCmsHomeSection, patchCmsPage, patchCmsSiteSettings, patchCmsThemeToken, uploadCmsMedia, } from "../services/cms.service.js";
// Handles 'getSiteSettings' workflow for this module.
export async function getSiteSettings(_req: Request, res: Response) {
    const data = await getCmsSiteSettings();
    sendSuccess(res, data);
}
// Handles 'patchSiteSettings' workflow for this module.
export async function patchSiteSettings(req: Request, res: Response) {
    const data = await patchCmsSiteSettings(req.user!.id, req.body);
    sendSuccess(res, data, "Site settings updated successfully.");
}
// Handles 'getPages' workflow for this module.
export async function getPages(req: Request, res: Response) {
    const result = await listCmsPages(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'patchPage' workflow for this module.
export async function patchPage(req: Request, res: Response) {
    const data = await patchCmsPage(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Page updated successfully.");
}
// Handles 'getHomeSections' workflow for this module.
export async function getHomeSections(req: Request, res: Response) {
    const result = await listCmsHomeSections(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'patchHomeSection' workflow for this module.
export async function patchHomeSection(req: Request, res: Response) {
    const data = await patchCmsHomeSection(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Home section updated successfully.");
}
// Handles 'getMedia' workflow for this module.
export async function getMedia(req: Request, res: Response) {
    const result = await listCmsMedia(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'postMedia' workflow for this module.
export async function postMedia(req: Request, res: Response) {
    const data = await uploadCmsMedia(req.user!.id, req.body);
    sendSuccess(res, data, "Media uploaded successfully.", 201);
}
// Handles 'getTheme' workflow for this module.
export async function getTheme(req: Request, res: Response) {
    const result = await listCmsThemeTokens(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'createTheme' workflow for this module.
export async function createTheme(req: Request, res: Response) {
    const data = await createCmsThemeToken(req.user!.id, req.body);
    sendSuccess(res, data, "Theme token created successfully.", 201);
}
// Handles 'patchTheme' workflow for this module.
export async function patchTheme(req: Request, res: Response) {
    const data = await patchCmsThemeToken(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Theme token updated successfully.");
}





