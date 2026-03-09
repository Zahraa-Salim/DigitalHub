// File: server/src/controllers/logs.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { sendList } from "../utils/httpResponse.js";
import { listActivityLogsService } from "../services/logs.service.js";
export async function getLogs(req, res) {
    const result = await listActivityLogsService(req.query);
    sendList(res, result.data, result.pagination);
}


