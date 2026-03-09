// File: server/src/controllers/attendance.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
// @ts-nocheck
import { sendSuccess } from "../utils/httpResponse.js";
import {
  getAttendanceSheetService,
  getStudentAttendanceService,
  listRunningAttendanceCohortsService,
  saveAttendanceSheetService,
} from "../services/attendance.service.js";

export async function listRunningAttendanceCohorts(req, res) {
  const data = await listRunningAttendanceCohortsService();
  sendSuccess(res, data);
}

export async function getAttendanceSheet(req, res) {
  const data = await getAttendanceSheetService(req.query);
  sendSuccess(res, data);
}

export async function saveAttendanceSheet(req, res) {
  const data = await saveAttendanceSheetService(req.user.id, req.body);
  sendSuccess(res, data, "Attendance saved successfully.");
}

export async function getStudentAttendance(req, res) {
  const data = await getStudentAttendanceService(Number(req.params.userId), req.query);
  sendSuccess(res, data);
}
