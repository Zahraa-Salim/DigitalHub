// File: server/src/routes/logs.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
// @ts-nocheck
import { Router } from "express";
import { getLogs } from "../controllers/logs.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const logsRouter = Router();
logsRouter.use(verifyAdminAuth);
logsRouter.get("/", asyncHandler(getLogs));
export { logsRouter };


