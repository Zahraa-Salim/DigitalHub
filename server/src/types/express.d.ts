// File: server/src/types/express.d.ts
// Purpose: Defines shared TypeScript types for express.
// It extends or centralizes backend typing used across the server codebase.

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

