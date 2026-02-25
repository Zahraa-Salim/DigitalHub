// File Summary: server/src/controllers/applications.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { approveApplicationService, createApplicationService, listApplicationsService, rejectApplicationService, } from "../services/applications.service.js";
export async function createApplication(req, res) {
    const data = await createApplicationService(req.body);
    sendSuccess(res, data, "Application submitted successfully.", 201);
}
export async function getApplications(req, res) {
    const result = await listApplicationsService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function approveApplication(req, res) {
    const data = await approveApplicationService(Number(req.params.id), req.user.id, {
        message: req.body.message,
        send_email: req.body.send_email,
        send_phone: req.body.send_phone,
    });
    sendSuccess(res, data, "Application approved successfully.");
}
export async function rejectApplication(req, res) {
    const data = await rejectApplicationService(Number(req.params.id), req.user.id, {
        reason: req.body.reason,
        message: req.body.message,
        send_email: req.body.send_email,
        send_phone: req.body.send_phone,
    });
    sendSuccess(res, data, "Application rejected successfully.");
}


