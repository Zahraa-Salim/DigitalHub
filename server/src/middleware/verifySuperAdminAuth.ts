// File Summary: server/src/middleware/verifySuperAdminAuth.ts
// Layer: middleware
// Purpose: Enforces that request user is authenticated admin and specifically a super admin.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck

import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { verifyAdminAuth } from "./verifyAdminAuth.js";

export async function verifySuperAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    await new Promise<void>((resolve, reject) => {
      verifyAdminAuth(req, res, (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    if (req.user?.role !== "super_admin") {
      throw new AppError(403, "FORBIDDEN", "Super admin access required.");
    }

    next();
  } catch (error) {
    next(error);
  }
}
