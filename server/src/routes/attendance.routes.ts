// File: server/src/routes/attendance.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
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
