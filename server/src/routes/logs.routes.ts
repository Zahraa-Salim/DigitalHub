// File: server/src/routes/logs.routes.ts
// Purpose: Registers the Express routes for logs.
// It wires endpoint paths to middleware and controller handlers for this feature area.

// @ts-nocheck

import { Router } from "express";
import { getLogs } from "../controllers/logs.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const logsRouter = Router();
logsRouter.use(verifyAdminAuth);
logsRouter.get("/", asyncHandler(getLogs));
export { logsRouter };

