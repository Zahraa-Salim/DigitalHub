// File Summary: server/src/schemas/auth.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const loginBodySchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
}).strict();


