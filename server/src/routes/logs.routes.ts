// File Summary: server/src/routes/logs.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { getLogs } from "../controllers/logs.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const logsRouter = Router();
logsRouter.use(verifyAdminAuth);
logsRouter.get("/", asyncHandler(getLogs));
export { logsRouter };


