// File Summary: server/src/routes/cms.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { createTheme, getHomeSections, getMedia, getPages, getSiteSettings, getTheme, patchHomeSection, patchPage, patchSiteSettings, patchTheme, postMedia, } from "../controllers/cms.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { homeSectionPatchSchema, idParamsSchema, mediaUploadSchema, pagePatchSchema, siteSettingsPatchSchema, themeCreateSchema, themePatchSchema, } from "../schemas/cms.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const cmsRouter = Router();
cmsRouter.use(verifyAdminAuth);
cmsRouter.get("/site-settings", asyncHandler(getSiteSettings));
cmsRouter.patch("/site-settings", validateRequest({ body: siteSettingsPatchSchema }), asyncHandler(patchSiteSettings));
cmsRouter.get("/pages", asyncHandler(getPages));
cmsRouter.patch("/pages/:id", validateRequest({ params: idParamsSchema, body: pagePatchSchema }), asyncHandler(patchPage));
cmsRouter.get("/home-sections", asyncHandler(getHomeSections));
cmsRouter.patch("/home-sections/:id", validateRequest({ params: idParamsSchema, body: homeSectionPatchSchema }), asyncHandler(patchHomeSection));
cmsRouter.get("/media", asyncHandler(getMedia));
cmsRouter.post("/media", validateRequest({ body: mediaUploadSchema }), asyncHandler(postMedia));
cmsRouter.get("/theme", asyncHandler(getTheme));
cmsRouter.post("/theme", validateRequest({ body: themeCreateSchema }), asyncHandler(createTheme));
cmsRouter.patch("/theme/:id", validateRequest({ params: idParamsSchema, body: themePatchSchema }), asyncHandler(patchTheme));
export { cmsRouter };


