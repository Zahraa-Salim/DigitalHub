// File: server/src/middleware/verifySuperAdminAuth.ts
// Purpose: Authenticates bearer tokens and only allows super admin users through.
// It verifies the current admin role before protected super admin routes continue.

import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { verifyAdminAuth } from "./verifyAdminAuth.js";

// Handles 'verifySuperAdminAuth' workflow for this module.
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
      throw new AppError(403, "FORBIDDEN", "Super admin access required.", undefined);
    }

    next();
  } catch (error) {
    next(error);
  }
}

