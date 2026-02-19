// File Summary: server/src/controllers/logs.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList } from "../utils/httpResponse.js";
import { listActivityLogsService } from "../services/logs.service.js";
export async function getLogs(req, res) {
    const result = await listActivityLogsService(req.query);
    sendList(res, result.data, result.pagination);
}


