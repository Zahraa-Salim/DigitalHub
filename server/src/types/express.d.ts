// File Summary: server/src/types/express.d.ts
// Layer: types
// Purpose: Declares TypeScript extensions for authenticated Express request handling.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.

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
