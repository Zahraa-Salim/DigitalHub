import { api, apiList, type PaginationMeta } from "../utils/api";
import { buildQueryString } from "../utils/query";

export type ProgramApplicationStage =
  | "applied"
  | "reviewing"
  | "invited_to_interview"
  | "interview_confirmed"
  | "accepted"
  | "rejected"
  | "participation_confirmed";

export type ProgramApplicationFormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "select"
  | "checkbox"
  | "date"
  | "file";

export type ProgramApplicationFormField = {
  id?: number;
  form_id?: number;
  name: string;
  label: string;
  type: ProgramApplicationFormFieldType;
  required?: boolean;
  options?: unknown;
  placeholder?: string | null;
  min_length?: number | null;
  max_length?: number | null;
  sort_order?: number;
  is_enabled?: boolean;
};

export type ProgramApplicationForm = {
  id: number;
  key: string;
  title: string | null;
  description: string | null;
  is_active: boolean;
  updated_at: string;
};

export type ProgramApplicationListItem = {
  id: number;
  program_id: number;
  cohort_id: number | null;
  applicant_id: number | null;
  applicant_email_norm: string | null;
  applicant_phone_norm: string | null;
  submission_answers: Record<string, unknown>;
  stage: ProgramApplicationStage;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_message: string | null;
  participation_confirmed_at?: string | null;
  participation_note?: string | null;
  user_created_at?: string | null;
  created_user_id?: number | null;
  created_at: string;
  updated_at: string;
  program_slug: string;
  program_title: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  interview_id: number | null;
  interview_status: string | null;
  interview_scheduled_at: string | null;
  interview_location_type: string | null;
};

export type ProgramApplicationDetail = {
  program_application: Record<string, unknown>;
  applicant: Record<string, unknown> | null;
  program: Record<string, unknown>;
  interview: Record<string, unknown> | null;
  messages: ProgramApplicationMessage[];
};

export type ProgramApplicationMessage = {
  id: number;
  application_id: number | null;
  program_application_id: number;
  channel: "email" | "sms";
  to_value: string;
  subject: string | null;
  body: string;
  template_key: string | null;
  status: "draft" | "sent" | "failed";
  sent_at: string | null;
  created_by: number | null;
  created_at: string;
};

export type ApplicationMessage = {
  id: number;
  application_id: number;
  program_application_id: number | null;
  channel: "email" | "sms";
  to_value: string;
  subject: string | null;
  body: string;
  template_key: string | null;
  status: "draft" | "sent" | "failed";
  sent_at: string | null;
  created_by: number | null;
  created_at: string;
};

export type MessagingUser = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_admin: boolean;
  is_instructor: boolean;
  is_student: boolean;
  is_active: boolean;
  created_at: string;
};

export type MessageTemplateChannel = "email" | "sms" | "all";

export type MessageTemplate = {
  id: number;
  key: string;
  label: string;
  description: string | null;
  channel: MessageTemplateChannel;
  subject: string | null;
  body: string;
  is_active: boolean;
  sort_order: number;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
};

export type AdminOverviewData = {
  pipelineHealth: {
    newApplications: number;
    reviewingOver3Days: number;
    invitedNoInterviewConfirm: number;
    interviewDoneNoDecision: number;
    acceptedNoParticipation: number;
    confirmedNoUser: number;
  };
  interviews: {
    today: number;
    upcoming: number;
    pendingConfirmations: number;
    rescheduleRequests: number;
    confirmRate: number;
  };
  onboardingGaps: {
    accepted: number;
    participationConfirmed: number;
    userCreated: number;
    enrollmentCreated: number;
  };
  messagingHealth: {
    email: { draft: number; sent: number; failed: number };
    whatsapp: { draft: number; sent: number; failed: number };
  };
  cohortConfigIssues: Array<{ cohort_id: number; cohort_name: string; issue: string }>;
  generalApplySummary: {
    applied: number;
    reviewing: number;
    invited_to_interview: number;
    interview_confirmed: number;
    accepted: number;
    rejected: number;
    participation_confirmed: number;
  };
  conversion: {
    generalApplicants: number;
    convertedToCohort: number;
    convertedToUser: number;
  };
  capacityAlerts: Array<{ cohort_id: number; cohort_name: string; enrolled: number; capacity: number }>;
  activityFeed: Array<{ id: number; type: string; text: string; created_at: string; metadata: unknown }>;
  superAdmin?: {
    admins: Array<{
      user_id: number;
      name: string;
      role: string;
      is_active: boolean;
      last_login_at: string | null;
    }>;
  };
};

export async function getProgramApplicationForm(): Promise<{ form: ProgramApplicationForm; fields: ProgramApplicationFormField[] }> {
  return api("/forms/program-application");
}

export async function updateProgramApplicationForm(
  payload: Partial<Pick<ProgramApplicationForm, "title" | "description" | "is_active">>,
): Promise<{ form: ProgramApplicationForm; fields: ProgramApplicationFormField[] }> {
  return api("/forms/program-application", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateProgramApplicationFormFields(
  payload: { fields: ProgramApplicationFormField[] },
): Promise<{ form: ProgramApplicationForm; fields: ProgramApplicationFormField[] }> {
  return api("/forms/program-application/fields", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listProgramApplications(params: {
  page?: number;
  limit?: number;
  sortBy?: "created_at" | "updated_at" | "stage";
  order?: "asc" | "desc";
  stage?: ProgramApplicationStage;
  program_id?: number;
  search?: string;
}): Promise<{ data: ProgramApplicationListItem[]; pagination: PaginationMeta }> {
  return apiList<ProgramApplicationListItem>(`/program-applications${buildQueryString(params)}`);
}

export async function getProgramApplicationDetail(id: number): Promise<ProgramApplicationDetail> {
  return api(`/program-applications/${id}`);
}

export async function updateProgramApplicationStage(
  id: number,
  payload: { stage: ProgramApplicationStage; review_message?: string },
): Promise<Record<string, unknown>> {
  return api(`/program-applications/${id}/stage`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function scheduleProgramApplicationInterview(
  id: number,
  payload: {
    scheduled_at: string;
    duration_minutes?: number;
    location_type: "online" | "in_person" | "phone";
    location_details?: string;
    channels?: { email?: boolean; sms?: boolean };
  },
): Promise<Record<string, unknown>> {
  return api(`/program-applications/${id}/interview/schedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function markProgramApplicationInterviewCompleted(id: number): Promise<Record<string, unknown>> {
  return api(`/program-applications/${id}/interview/mark-completed`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function createApplicationMessage(
  id: number,
  payload: {
    channel: "email" | "sms";
    to_value: string;
    subject?: string;
    body: string;
    template_key?: string;
  },
): Promise<ApplicationMessage> {
  return api(`/applications/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function scheduleApplicationInterview(
  id: number,
  payload: {
    scheduled_at: string;
    duration_minutes?: number;
    location_type?: "online" | "in_person" | "phone";
    location_details?: string;
    send_email?: boolean;
    send_phone?: boolean;
    email_subject?: string;
    email_body?: string;
    sms_body?: string;
  },
): Promise<Record<string, unknown>> {
  return api(`/applications/${id}/interview/schedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendApplicationMessage(
  id: number,
  messageId: number,
): Promise<ApplicationMessage> {
  return api(`/applications/${id}/messages/${messageId}/send`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function createUserFromApplication(id: number): Promise<Record<string, unknown>> {
  return api(`/applications/${id}/create-user`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function listProgramApplicationMessages(id: number): Promise<{ program_application_id: number; messages: ProgramApplicationMessage[] }> {
  return api(`/program-applications/${id}/messages`);
}

export async function createProgramApplicationMessage(
  id: number,
  payload: {
    channel: "email" | "sms";
    to_value?: string;
    subject?: string;
    body: string;
    template_key?: string;
  },
): Promise<ProgramApplicationMessage> {
  return api(`/program-applications/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendProgramApplicationMessage(
  id: number,
  messageId: number,
): Promise<ProgramApplicationMessage> {
  return api(`/program-applications/${id}/messages/${messageId}/send`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function decideProgramApplication(
  id: number,
  payload: {
    decision: "accepted" | "rejected";
    channels?: { email?: boolean; sms?: boolean };
    messageOverride?: string;
  },
): Promise<Record<string, unknown>> {
  return api(`/program-applications/${id}/decision`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmProgramApplicationParticipation(
  id: number,
  payload: { note?: string },
): Promise<Record<string, unknown>> {
  return api(`/program-applications/${id}/participation/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createUserFromProgramApplication(id: number): Promise<Record<string, unknown>> {
  return api(`/program-applications/${id}/create-user`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function listMessagingUsers(params: {
  page?: number;
  limit?: number;
  sortBy?: "full_name" | "email" | "created_at";
  order?: "asc" | "desc";
  search?: string;
}): Promise<{ data: MessagingUser[]; pagination: PaginationMeta }> {
  return apiList<MessagingUser>(`/auth/users${buildQueryString(params)}`);
}

export async function sendMessagingUsers(payload: {
  channel: "email" | "sms";
  user_ids: number[];
  subject?: string;
  body: string;
}): Promise<{
  channel: "email" | "sms";
  requested_count: number;
  sent_count: number;
  skipped_count: number;
  skipped_users: Array<{ id: number; reason: string }>;
}> {
  return api("/auth/users/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listMessageTemplates(params?: {
  include_inactive?: boolean;
}): Promise<MessageTemplate[]> {
  return api(`/message-templates${buildQueryString(params ?? {})}`);
}

export async function updateMessageTemplate(
  key: string,
  payload: Partial<{
    label: string;
    description: string | null;
    channel: MessageTemplateChannel;
    subject: string | null;
    body: string;
    is_active: boolean;
    sort_order: number;
  }>,
): Promise<MessageTemplate> {
  return api(`/message-templates/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createMessageTemplate(
  payload: {
    key?: string;
    label: string;
    description?: string | null;
    channel?: MessageTemplateChannel;
    subject?: string | null;
    body: string;
    is_active?: boolean;
    sort_order?: number;
  },
): Promise<MessageTemplate> {
  return api("/message-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  return api("/admin/overview");
}

export async function retryAdminOverviewFailedMessages(payload: {
  channel: "email" | "whatsapp";
  limit?: number;
}): Promise<{
  channel: "email" | "whatsapp";
  attempted: number;
  retried: number;
  failed: number;
  skipped: number;
}> {
  return api("/admin/overview/messages/retry-failed", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
