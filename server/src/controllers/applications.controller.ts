// File: server/src/controllers/applications.controller.ts
// Purpose: Handles HTTP request and response flow for applications.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
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
  resendAcceptanceMessageService,
  scheduleApplicationInterviewService,
  sendApplicationMessageService,
  setApplicationDecisionService,
  shortlistApplicationService,
} from "../services/applications.service.js";

function getParamValue(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] : value ?? "";
}
// Handles 'createApplication' workflow for this module.
export async function createApplication(req: Request, res: Response) {
    const data = await createApplicationService(req.body);
    sendSuccess(res, data, "Application submitted successfully.", 201);
}
// Handles 'getApplications' workflow for this module.
export async function getApplications(req: Request, res: Response) {
    const result = await listApplicationsService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'approveApplication' workflow for this module.
export async function approveApplication(req: Request, res: Response) {
    const data = await approveApplicationService(Number(req.params.id), req.user!.id, {
        message: req.body.message,
        send_email: req.body.send_email,
        send_phone: req.body.send_phone,
    });
    sendSuccess(res, data, "Application approved successfully.");
}
// Handles 'rejectApplication' workflow for this module.
export async function rejectApplication(req: Request, res: Response) {
    const data = await rejectApplicationService(Number(req.params.id), req.user!.id, {
        reason: req.body.reason,
        message: req.body.message,
        send_email: req.body.send_email,
        send_phone: req.body.send_phone,
    });
    sendSuccess(res, data, "Application rejected successfully.");
}

// Handles 'getApplicationPipeline' workflow for this module.
export async function getApplicationPipeline(req: Request, res: Response) {
    const data = await getApplicationPipelineService(Number(req.params.id));
    sendSuccess(res, data);
}

// Handles 'patchApplicationStage' workflow for this module.
export async function patchApplicationStage(req: Request, res: Response) {
    const data = await patchApplicationStageService(Number(req.params.id), req.user!?.id ?? null, req.body);
    sendSuccess(res, data, "Application stage updated successfully.");
}

// Handles 'shortlistApplication' workflow for this module.
export async function shortlistApplication(req: Request, res: Response) {
    const data = await shortlistApplicationService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Application shortlisted successfully.");
}

// Handles 'scheduleInterview' workflow for this module.
export async function scheduleInterview(req: Request, res: Response) {
    const data = await scheduleApplicationInterviewService(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Interview scheduled successfully.");
}

// Handles 'markInterviewCompleted' workflow for this module.
export async function markInterviewCompleted(req: Request, res: Response) {
    const data = await markApplicationInterviewCompletedService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Interview marked completed.");
}

// Handles 'setApplicationDecision' workflow for this module.
export async function setApplicationDecision(req: Request, res: Response) {
    const data = await setApplicationDecisionService(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Application decision saved successfully.");
}

// Handles 'confirmParticipation' workflow for this module.
export async function confirmParticipation(req: Request, res: Response) {
    const data = await confirmApplicationParticipationService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Participation confirmed successfully.");
}

// Handles 'createUserFromApplication' workflow for this module.
export async function createUserFromApplication(req: Request, res: Response) {
    const data = await createUserFromApplicationService(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "User and enrollment created successfully.");
}

// Handles 'getApplicationMessages' workflow for this module.
export async function getApplicationMessages(req: Request, res: Response) {
    const data = await listApplicationMessagesService(Number(req.params.id));
    sendSuccess(res, data);
}

// Handles 'postApplicationMessage' workflow for this module.
export async function postApplicationMessage(req: Request, res: Response) {
    const data = await createApplicationMessageDraftService(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, data, "Message draft created successfully.", 201);
}

// Handles 'sendApplicationMessage' workflow for this module.
export async function sendApplicationMessage(req: Request, res: Response) {
    const data = await sendApplicationMessageService(Number(req.params.id), Number(req.params.messageId), req.user!.id);
    sendSuccess(res, data, "Message marked as sent.");
}

export async function resendAcceptanceMessage(req: Request, res: Response) {
    const data = await resendAcceptanceMessageService(Number(req.params.id), req.user!.id);
    sendSuccess(res, data, "Acceptance message resent successfully.");
}

// Handles 'confirmInterviewByToken' workflow for this module.
export async function confirmInterviewByToken(req: Request, res: Response) {
    const token = getParamValue(req.params.token);
    const data = await publicConfirmInterviewService(token, req.body);
    sendSuccess(res, data, "Interview confirmed successfully.");
}

// Handles 'rescheduleInterviewByToken' workflow for this module.
export async function rescheduleInterviewByToken(req: Request, res: Response) {
    const token = getParamValue(req.params.token);
    const data = await publicRescheduleInterviewService(token, req.body);
    sendSuccess(res, data, "Interview reschedule request submitted.");
}

// Handles 'confirmInterviewByTokenLink' workflow for this module.
export async function confirmInterviewByTokenLink(req: Request, res: Response) {
    const token = getParamValue(req.params.token);
    const data = await publicConfirmInterviewService(token, { note: null });
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

// Handles 'rescheduleInterviewByTokenLink' workflow for this module.
export async function rescheduleInterviewByTokenLink(req: Request, res: Response) {
    const token = getParamValue(req.params.token);
    if (String(req.headers.accept || "").includes("text/html")) {
        const apiBase = (process.env.PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
        res.status(200).send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Request Interview Reschedule</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 20px; }
    label { display: block; margin: 16px 0 4px; font-weight: bold; }
    input, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    button { margin-top: 20px; padding: 10px 24px; background: #2563eb; color: #fff; border: 0; border-radius: 6px; cursor: pointer; font-size: 1rem; }
    #success { display: none; color: green; margin-top: 16px; }
    #error { display: none; color: red; margin-top: 16px; }
  </style>
</head>
<body>
  <h2>Request Interview Reschedule</h2>
  <p>Please enter your preferred time and any notes for the admissions team.</p>
  <label for="requested_at">Preferred Date & Time</label>
  <input type="datetime-local" id="requested_at" required/>
  <label for="note">Note (optional)</label>
  <textarea id="note" rows="3" placeholder="Any additional context..."></textarea>
  <button onclick="submitForm()">Submit Reschedule Request</button>
  <p id="success">Submitted. Our team will contact you with a new schedule.</p>
  <p id="error">Something went wrong. Please try again or contact us directly.</p>
  <script>
    async function submitForm() {
      const requestedAt = document.getElementById('requested_at').value;
      const note = document.getElementById('note').value;
      if (!requestedAt) { alert('Please select a preferred date and time.'); return; }
      try {
        const response = await fetch('${apiBase}/public/interviews/${token}/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requested_at: new Date(requestedAt).toISOString(), note })
        });
        if (response.ok) {
          document.querySelector('button').style.display = 'none';
          document.getElementById('success').style.display = 'block';
          document.getElementById('error').style.display = 'none';
        } else {
          document.getElementById('error').style.display = 'block';
        }
      } catch {
        document.getElementById('error').style.display = 'block';
      }
    }
  </script>
</body>
</html>`);
        return;
    }
    const data = await publicRescheduleInterviewService(token, {
        requested_at: new Date().toISOString(),
        note: "Requested via public link",
    });
    sendSuccess(res, data, "Interview reschedule request submitted.");
}

// Handles 'confirmParticipationByToken' workflow for this module.
export async function confirmParticipationByToken(req: Request, res: Response) {
    const token = getParamValue(req.params.token);
    const data = await publicConfirmParticipationService(token, req.body);
    sendSuccess(res, data, "Participation confirmed successfully.");
}

// Handles 'confirmParticipationByTokenLink' workflow for this module.
export async function confirmParticipationByTokenLink(req: Request, res: Response) {
    const token = getParamValue(req.params.token);
    const data = await publicConfirmParticipationService(token, { note: "Confirmed via public link" });
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






