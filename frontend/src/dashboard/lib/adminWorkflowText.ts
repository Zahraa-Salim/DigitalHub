// File: frontend/src/dashboard/lib/adminWorkflowText.ts
// Purpose: Provides dashboard helper logic for admin workflow text.
// It keeps admin-specific text, API helpers, and derived behavior out of page components.

import { ApiError } from "../utils/api";

export type WorkflowStage =
  | "applied"
  | "reviewing"
  | "invited_to_interview"
  | "interview_confirmed"
  | "accepted"
  | "rejected"
  | "participation_confirmed";

const WORKFLOW_STAGE_ORDER: WorkflowStage[] = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "participation_confirmed",
];

type StatusLabelOptions = {
  confirmedLabel?: string;
};

export function workflowStatusLabel(stage: WorkflowStage, options?: StatusLabelOptions): string {
  if (stage === "invited_to_interview") return "Invited to Interview";
  if (stage === "interview_confirmed") return "Interview Confirmed";
  if (stage === "participation_confirmed") return options?.confirmedLabel || "Participation Confirmed";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export function getSkippedStageTransitionWarning(
  currentStage: WorkflowStage,
  nextStage: WorkflowStage,
  options?: StatusLabelOptions,
): string | null {
  if (currentStage === nextStage || currentStage === "rejected" || nextStage === "rejected") {
    return null;
  }

  const currentIndex = WORKFLOW_STAGE_ORDER.indexOf(currentStage);
  const targetIndex = WORKFLOW_STAGE_ORDER.indexOf(nextStage);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex <= currentIndex + 1) {
    return null;
  }

  const skippedStages = WORKFLOW_STAGE_ORDER.slice(currentIndex + 1, targetIndex).map((stage) =>
    workflowStatusLabel(stage, options),
  );
  const skippedText = skippedStages.length ? ` This skips ${skippedStages.join(" -> ")}.` : "";

  return (
    `This moves the applicant directly from ${workflowStatusLabel(currentStage, options)} ` +
    `to ${workflowStatusLabel(nextStage, options)}.${skippedText}`
  );
}

export function toFriendlyCreateUserError(
  error: unknown,
  fallbackName = "This applicant",
  notFoundCode = "APPLICATION_NOT_FOUND",
): string {
  if (!(error instanceof ApiError)) {
    return "We couldn't create a user account right now. Please try again.";
  }

  if (error.code === "INVALID_STAGE") {
    return `${fallbackName} is not ready for account creation yet. Move the status to Accepted or Participation Confirmed, then try again.`;
  }

  if (error.code === notFoundCode) {
    return "This application could not be found. Refresh the page and try again.";
  }

  return error.message || "We couldn't create a user account right now. Please try again.";
}

export function buildInterviewScheduleFeedback(applicantName: string, hasEmail: boolean, hasPhone: boolean): string {
  if (hasEmail && hasPhone) {
    return `Interview scheduled for ${applicantName}. Email and WhatsApp messages were sent.`;
  }
  if (hasEmail) {
    return `Interview scheduled for ${applicantName}. The email message was sent.`;
  }
  if (hasPhone) {
    return `Interview scheduled for ${applicantName}. The WhatsApp message was sent.`;
  }
  return `Interview scheduled for ${applicantName}. No email or phone is available, so no message was sent.`;
}

export function toFriendlyDeliveryFailure(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("badcredentials") || normalized.includes("invalid login") || normalized.includes("535-5.7.8")) {
    return "SMTP authentication failed. Update SMTP_USER and SMTP_PASS (for Gmail use a 16-character App Password).";
  }
  return message;
}

