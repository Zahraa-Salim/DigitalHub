// File: server/src/controllers/attendance.controller.ts
// Purpose: Handles HTTP request and response flow for attendance.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendSuccess } from "../utils/httpResponse.js";
import {
  getAttendanceSheetService,
  getStudentAttendanceService,
  listRunningAttendanceCohortsService,
  saveAttendanceSheetService,
} from "../services/attendance.service.js";

// Handles 'listRunningAttendanceCohorts' workflow for this module.
export async function listRunningAttendanceCohorts(req: Request, res: Response) {
  const data = await listRunningAttendanceCohortsService();
  sendSuccess(res, data);
}

// Handles 'getAttendanceSheet' workflow for this module.
export async function getAttendanceSheet(req: Request, res: Response) {
  const data = await getAttendanceSheetService(req.query);
  sendSuccess(res, data);
}

// Handles 'saveAttendanceSheet' workflow for this module.
export async function saveAttendanceSheet(req: Request, res: Response) {
  const data = await saveAttendanceSheetService(req.user!.id, req.body);
  sendSuccess(res, data, "Attendance saved successfully.");
}

// Handles 'getStudentAttendance' workflow for this module.
export async function getStudentAttendance(req: Request, res: Response) {
  const data = await getStudentAttendanceService(Number(req.params.userId), req.query);
  sendSuccess(res, data);
}





