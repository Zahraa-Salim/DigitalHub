// File Summary: server/src/controllers/attendance.controller.ts
// Layer: controllers
// Purpose: Maps validated attendance HTTP input to services and sends responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
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
