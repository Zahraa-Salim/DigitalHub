import type { MessageTemplate } from "./api";

export const FALLBACK_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: -1,
    key: "general_update",
    label: "General Update",
    description: "Generic update for applicants/users.",
    channel: "all",
    subject: "General Update",
    body: "Hello {name},\n\nWe have a quick update for you.\n\nBest regards,\nDigital Hub Team",
    is_active: true,
    sort_order: 10,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: -2,
    key: "interview_scheduling",
    label: "Interview Scheduling",
    description: "Template for interview scheduling messages.",
    channel: "all",
    subject: "Interview Invitation",
    body:
      "Dear {name},\n\nYour interview has been scheduled on {scheduled_at}.\n" +
      "Duration: {duration_minutes} minutes\n" +
      "Location Type: {location_type}\n" +
      "Location Details: {location_details}\n" +
      "Application ID: {application_id}\n" +
      "Confirm Token: {confirm_token}\n" +
      "Confirm here: {confirm_url}\n" +
      "Reschedule here: {reschedule_url}\n\nBest regards,\nAdmissions Team",
    is_active: true,
    sort_order: 40,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: -3,
    key: "interview_confirmation",
    label: "Interview Confirmation",
    description: "Template when interview is confirmed.",
    channel: "all",
    subject: "Interview Confirmed",
    body:
      "Dear {name},\n\nYour interview is confirmed for {scheduled_at}.\n" +
      "We look forward to speaking with you.\n\nBest regards,\nAdmissions Team",
    is_active: true,
    sort_order: 50,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: -4,
    key: "decision_accepted",
    label: "Acceptance Letter",
    description: "Template for accepted decisions.",
    channel: "all",
    subject: "Application Accepted",
    body:
      "Dear {name},\n\nCongratulations. You have been accepted into our program.\n" +
      "If you are sure you want to join, please confirm here:\n{participation_confirm_url}\n\n" +
      "Warm regards,\nAdmissions Team",
    is_active: true,
    sort_order: 60,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: -5,
    key: "decision_rejected",
    label: "Rejection Notice",
    description: "Template for rejected decisions.",
    channel: "all",
    subject: "Application Update",
    body:
      "Dear {name},\n\nThank you for applying. After careful review, we are unable to offer a place at this time.\n\nBest regards,\nAdmissions Team",
    is_active: true,
    sort_order: 70,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: -6,
    key: "account_credentials",
    label: "Account Credentials",
    description: "Sent automatically when admin creates a user from an application.",
    channel: "all",
    subject: "Your Digital Hub Account",
    body:
      "Dear {name},\n\n" +
      "Your student account has been created.\n" +
      "Email: {email}\n" +
      "Temporary Password: {generated_password}\n" +
      "Sign in here: {sign_in_url}\n\n" +
      "Please sign in and change your password.\n\nBest regards,\nDigital Hub Team",
    is_active: true,
    sort_order: 80,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
];

export function filterTemplatesForChannel(
  templates: MessageTemplate[],
  channel: "email" | "sms",
): MessageTemplate[] {
  return templates
    .filter((template) => template.is_active && (template.channel === "all" || template.channel === channel))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
}

export function applyTemplateTokens(input: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((text, [key, value]) => {
    if (value === undefined || value === null || value === "") {
      return text;
    }
    const safeValue = value;
    return text.replaceAll(`{${key}}`, safeValue);
  }, input);
}
