// File Summary: server/src/routes/applications.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { approveApplication, createApplication, getApplications, rejectApplication, } from "../controllers/applications.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { applicationCreateSchema, approveBodySchema, idParamsSchema, rejectBodySchema, } from "../schemas/applications.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const applicationsRouter = Router();
applicationsRouter.post("/", rateLimit({
    keyPrefix: "rl:public:applications",
    windowSec: 600,
    max: 5,
}), validateRequest({ body: applicationCreateSchema }), asyncHandler(createApplication));
applicationsRouter.use(verifyAdminAuth);
applicationsRouter.get("/", asyncHandler(getApplications));
applicationsRouter.patch("/:id/approve", validateRequest({ params: idParamsSchema, body: approveBodySchema }), asyncHandler(approveApplication));
applicationsRouter.patch("/:id/reject", validateRequest({ params: idParamsSchema, body: rejectBodySchema }), asyncHandler(rejectApplication));
export { applicationsRouter };


