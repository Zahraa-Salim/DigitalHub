// File: server/src/controllers/logs.controller.ts
// Purpose: Handles HTTP request and response flow for logs.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList } from "../utils/httpResponse.js";
import { listActivityLogsService } from "../services/logs.service.js";
// Handles 'getLogs' workflow for this module.
export async function getLogs(req: Request, res: Response) {
    const result = await listActivityLogsService(req.query);
    sendList(res, result.data, result.pagination);
}




