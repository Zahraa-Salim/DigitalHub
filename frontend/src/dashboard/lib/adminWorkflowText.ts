import { ApiError } from "../utils/api";

export type WorkflowStage =
  | "applied"
  | "reviewing"
  | "invited_to_interview"
  | "interview_confirmed"
  | "accepted"
  | "rejected"
  | "participation_confirmed";

type StatusLabelOptions = {
  confirmedLabel?: string;
};

export function workflowStatusLabel(stage: WorkflowStage, options?: StatusLabelOptions): string {
  if (stage === "invited_to_interview") return "Invited to Interview";
  if (stage === "interview_confirmed") return "Interview Confirmed";
  if (stage === "participation_confirmed") return options?.confirmedLabel || "Participation Confirmed";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
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
