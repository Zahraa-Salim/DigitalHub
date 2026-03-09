// File: server/src/types/express.d.ts
// What this code does:
// 1) Implements module-specific behavior for this code unit.
// 2) Coordinates inputs, internal processing, and outputs.
// 3) Uses shared utilities to keep logic consistent and reusable.
// 4) Exports functions/components used by other project modules.
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        isAdmin: boolean;
        role: "admin" | "super_admin";
      };
    }
  }
}

export {};
