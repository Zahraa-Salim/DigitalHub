// File: server/src/controllers/cms.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createCmsThemeToken, getCmsSiteSettings, listCmsHomeSections, listCmsMedia, listCmsPages, listCmsThemeTokens, patchCmsHomeSection, patchCmsPage, patchCmsSiteSettings, patchCmsThemeToken, uploadCmsMedia, } from "../services/cms.service.js";
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
export async function getMedia(req, res) {
    const result = await listCmsMedia(req.query);
    sendList(res, result.data, result.pagination);
}
export async function postMedia(req, res) {
    const data = await uploadCmsMedia(req.user.id, req.body);
    sendSuccess(res, data, "Media uploaded successfully.", 201);
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


