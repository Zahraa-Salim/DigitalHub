// File Summary: server/src/controllers/cms.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createCmsThemeToken, getCmsSiteSettings, listCmsHomeSections, listCmsPages, listCmsThemeTokens, patchCmsHomeSection, patchCmsPage, patchCmsSiteSettings, patchCmsThemeToken, } from "../services/cms.service.js";
export async function getSiteSettings(_req, res) {
    const data = await getCmsSiteSettings();
    sendSuccess(res, data);
}
export async function patchSiteSettings(req, res) {
    const data = await patchCmsSiteSettings(req.user.id, req.body);
    sendSuccess(res, data, "Site settings updated successfully.");
}
export async function getPages(req, res) {
    const result = await listCmsPages(req.query);
    sendList(res, result.data, result.pagination);
}
export async function patchPage(req, res) {
    const data = await patchCmsPage(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Page updated successfully.");
}
export async function getHomeSections(req, res) {
    const result = await listCmsHomeSections(req.query);
    sendList(res, result.data, result.pagination);
}
export async function patchHomeSection(req, res) {
    const data = await patchCmsHomeSection(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Home section updated successfully.");
}
export async function getTheme(req, res) {
    const result = await listCmsThemeTokens(req.query);
    sendList(res, result.data, result.pagination);
}
export async function createTheme(req, res) {
    const data = await createCmsThemeToken(req.user.id, req.body);
    sendSuccess(res, data, "Theme token created successfully.", 201);
}
export async function patchTheme(req, res) {
    const data = await patchCmsThemeToken(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Theme token updated successfully.");
}


