// File: server/src/routes/attendance.routes.ts
// Purpose: Registers the Express routes for attendance.
// It wires endpoint paths to middleware and controller handlers for this feature area.

// @ts-nocheck

import { Router } from "express";
import {
  getAttendanceSheet,
  getStudentAttendance,
  listRunningAttendanceCohorts,
  saveAttendanceSheet,
} from "../controllers/attendance.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  attendanceSheetQuerySchema,
  attendanceSheetSaveSchema,
  studentAttendanceParamsSchema,
  studentAttendanceQuerySchema,
} from "../schemas/attendance.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const attendanceRouter = Router();

attendanceRouter.use(verifyAdminAuth);
attendanceRouter.get("/cohorts/running", asyncHandler(listRunningAttendanceCohorts));
attendanceRouter.get(
  "/sheet",
  validateRequest({ query: attendanceSheetQuerySchema }),
  asyncHandler(getAttendanceSheet),
);
attendanceRouter.post(
  "/sheet",
  validateRequest({ body: attendanceSheetSaveSchema }),
  asyncHandler(saveAttendanceSheet),
);
attendanceRouter.get(
  "/students/:userId",
  validateRequest({ params: studentAttendanceParamsSchema, query: studentAttendanceQuerySchema }),
  asyncHandler(getStudentAttendance),
);

export { attendanceRouter };

