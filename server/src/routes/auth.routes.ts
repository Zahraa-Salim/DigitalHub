// File Summary: server/src/routes/auth.routes.ts
// Layer: routes
// Purpose: Wires URL paths to middleware and controller handlers for this API module.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import { login } from "../controllers/auth.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { loginBodySchema } from "../schemas/auth.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const authRouter = Router();
authRouter.post("/login", rateLimit({
    keyPrefix: "rl:auth:login",
    windowSec: 600,
    max: 10,
}), validateRequest({ body: loginBodySchema }), asyncHandler(login));
export { authRouter };


