// File Summary: server/src/controllers/auth.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendSuccess } from "../utils/httpResponse.js";
import { loginAdmin } from "../services/auth.service.js";
export async function login(req, res) {
    const payload = req.body;
    const data = await loginAdmin(payload);
    sendSuccess(res, data, "Login successful");
}


