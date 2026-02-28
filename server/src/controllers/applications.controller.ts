// File Summary: server/src/controllers/applications.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  approveApplicationService,
  confirmApplicationParticipationService,
  createApplicationMessageDraftService,
  createApplicationService,
  createUserFromApplicationService,
  getApplicationPipelineService,
  listApplicationMessagesService,
  listApplicationsService,
  markApplicationInterviewCompletedService,
  patchApplicationStageService,
  publicConfirmParticipationService,
  publicConfirmInterviewService,
  publicRescheduleInterviewService,
  rejectApplicationService,
  scheduleApplicationInterviewService,
  sendApplicationMessageService,
  setApplicationDecisionService,
  shortlistApplicationService,
} from "../services/applications.service.js";
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

export async function getApplicationPipeline(req, res) {
    const data = await getApplicationPipelineService(Number(req.params.id));
    sendSuccess(res, data);
}

export async function patchApplicationStage(req, res) {
    const data = await patchApplicationStageService(Number(req.params.id), req.user?.id ?? null, req.body);
    sendSuccess(res, data, "Application stage updated successfully.");
}

export async function shortlistApplication(req, res) {
    const data = await shortlistApplicationService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Application shortlisted successfully.");
}

export async function scheduleInterview(req, res) {
    const data = await scheduleApplicationInterviewService(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Interview scheduled successfully.");
}

export async function markInterviewCompleted(req, res) {
    const data = await markApplicationInterviewCompletedService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Interview marked completed.");
}

export async function setApplicationDecision(req, res) {
    const data = await setApplicationDecisionService(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Application decision saved successfully.");
}

export async function confirmParticipation(req, res) {
    const data = await confirmApplicationParticipationService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "Participation confirmed successfully.");
}

export async function createUserFromApplication(req, res) {
    const data = await createUserFromApplicationService(Number(req.params.id), req.user.id);
    sendSuccess(res, data, "User and enrollment created successfully.");
}

export async function getApplicationMessages(req, res) {
    const data = await listApplicationMessagesService(Number(req.params.id));
    sendSuccess(res, data);
}

export async function postApplicationMessage(req, res) {
    const data = await createApplicationMessageDraftService(Number(req.params.id), req.user.id, req.body);
    sendSuccess(res, data, "Message draft created successfully.", 201);
}

export async function sendApplicationMessage(req, res) {
    const data = await sendApplicationMessageService(Number(req.params.id), Number(req.params.messageId), req.user.id);
    sendSuccess(res, data, "Message marked as sent.");
}

export async function confirmInterviewByToken(req, res) {
    const data = await publicConfirmInterviewService(req.params.token, req.body);
    sendSuccess(res, data, "Interview confirmed successfully.");
}

export async function rescheduleInterviewByToken(req, res) {
    const data = await publicRescheduleInterviewService(req.params.token, req.body);
    sendSuccess(res, data, "Interview reschedule request submitted.");
}

export async function confirmInterviewByTokenLink(req, res) {
    const data = await publicConfirmInterviewService(req.params.token, { note: null });
    if (String(req.headers.accept || "").includes("text/html")) {
        res.status(200).send(`
<!doctype html>
<html><head><meta charset="utf-8"/><title>Interview Confirmed</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;">
  <h2>Interview confirmed successfully.</h2>
  <p>You can close this page now.</p>
</body></html>`);
        return;
    }
    sendSuccess(res, data, "Interview confirmed successfully.");
}

export async function rescheduleInterviewByTokenLink(req, res) {
    const data = await publicRescheduleInterviewService(req.params.token, {
        requested_at: new Date().toISOString(),
        note: "Requested via public link",
    });
    if (String(req.headers.accept || "").includes("text/html")) {
        res.status(200).send(`
<!doctype html>
<html><head><meta charset="utf-8"/><title>Reschedule Requested</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;">
  <h2>Interview reschedule request submitted.</h2>
  <p>Our team will contact you with a new schedule.</p>
</body></html>`);
        return;
    }
    sendSuccess(res, data, "Interview reschedule request submitted.");
}

export async function confirmParticipationByToken(req, res) {
    const data = await publicConfirmParticipationService(req.params.token, req.body);
    sendSuccess(res, data, "Participation confirmed successfully.");
}

export async function confirmParticipationByTokenLink(req, res) {
    const data = await publicConfirmParticipationService(req.params.token, { note: "Confirmed via public link" });
    if (String(req.headers.accept || "").includes("text/html")) {
        res.status(200).send(`
<!doctype html>
<html><head><meta charset="utf-8"/><title>Participation Confirmed</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;">
  <h2>Participation confirmed successfully.</h2>
  <p>Thank you. Your application has been moved to participation confirmed.</p>
</body></html>`);
        return;
    }
    sendSuccess(res, data, "Participation confirmed successfully.");
}


