// File: frontend/src/dashboard/pages/admin/AdmissionsPage.tsx
// Purpose: Renders the admin admissions page page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CsvExportModal, type CsvExportColumn } from "../../components/CsvExportModal";
import { ConfirmActionModal } from "../../components/ConfirmActionModal";
import { useGlobalMessagingContext } from "../../components/GlobalMessagingContext";
import { PageShell } from "../../components/PageShell";
import { PulseDots } from "../../components/PulseDots";
import { ToastStack } from "../../components/ToastStack";
import {
  createApplicationMessage,
  markApplicationInterviewCompleted,
  createUserFromApplication,
  listMessagingUsers,
  listMessageTemplates,
  resendAcceptanceMessage,
  scheduleApplicationInterview,
  sendApplicationMessage,
  type MessageTemplate,
} from "../../lib/api";
import {
  applyTemplateTokens,
  FALLBACK_MESSAGE_TEMPLATES,
  filterTemplatesForChannel,
} from "../../lib/messageTemplates";
import {
  buildInterviewScheduleFeedback,
  getSkippedStageTransitionWarning,
  toFriendlyCreateUserError,
  toFriendlyDeliveryFailure,
  workflowStatusLabel,
} from "../../lib/adminWorkflowText";
import { onboardingSkipReasonText, summarizeOnboardingMessage } from "../../lib/onboardingMessage";
import { useDashboardToasts } from "../../hooks/useDashboardToasts";
import { ApiError, api, apiList } from "../../utils/api";
import { buildQueryString } from "../../utils/query";
import "../../styles/general-apply.css";
import "../../styles/admissions-overrides.css";

type ApplicationStatus =
  | "applied"
  | "reviewing"
  | "invited_to_interview"
  | "interview_confirmed"
  | "accepted"
  | "rejected"
  | "participation_confirmed";
type SortField = "name" | "appliedDate" | "status";
type SortDirection = "asc" | "desc";
type RecipientGroup = "individual" | "all" | "selected" | ApplicationStatus;
type TabId = "All" | ApplicationStatus;
type InterviewLocationType = "online" | "in_person" | "phone";
type ConfirmState = {
  title: string;
  message: string;
};

type FilterState = {
  stages: ApplicationStatus[];
  dateFrom: string;
  dateTo: string;
  location: string;
  sortField: SortField;
  sortDirection: SortDirection;
};

type CohortOption = {
  id: number;
  name: string;
};

type ApiApplicationRow = {
  id: number;
  cohort_id: number;
  cohort_name: string | null;
  created_user_id?: number | null;
  status: string;
  stage: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_message: string | null;
  submitted_at: string;
  submission_answers?: unknown;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  interview_status?: string | null;
  interview_scheduled_at?: string | null;
};

type ApplicationPipelineResponse = {
  application: ApiApplicationRow;
  interview: Record<string, unknown> | null;
  messages: Array<Record<string, unknown>>;
};

type Applicant = {
  id: string;
  applicationId: number;
  createdUserId: number | null;
  cohortName: string;
  name: string;
  email: string;
  phone: string;
  appliedDate: string;
  status: ApplicationStatus;
  location: string;
  answers: Record<string, unknown>;
  reviewedAt: string | null;
  reviewedBy: number | null;
  reviewMessage: string | null;
  interviewStatus: string | null;
  interviewScheduledAt: string | null;
};

type CreateUserDeliveryChannels = {
  email: boolean;
  sms: boolean;
};

const PAGE_SIZE = 10;
const STATUSES: ApplicationStatus[] = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "rejected",
  "participation_confirmed",
];

const defaultFilters: FilterState = {
  stages: [],
  dateFrom: "",
  dateTo: "",
  location: "",
  sortField: "appliedDate",
  sortDirection: "desc",
};
const LAST_ADMISSIONS_COHORT_KEY = "dh:lastAdmissionsCohortId";

function getStoredAdmissionsCohortId(): string {
  const value = localStorage.getItem(LAST_ADMISSIONS_COHORT_KEY);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  return String(parsed);
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || "-";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toIsoDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toISOString();
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function formatUnknownValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatUnknownValue(item)).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toSubmittedLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasSubmittedValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => hasSubmittedValue(item));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => hasSubmittedValue(item));
  }
  return true;
}

function hasDeliverableEmail(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && trimmed !== "No email" && !trimmed.endsWith("@digitalhub.local");
}

function normalizeEmail(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function applicantHasUser(applicant: Applicant, existingUserEmails: Set<string>): boolean {
  return Boolean(applicant.createdUserId) || existingUserEmails.has(normalizeEmail(applicant.email));
}

function normalizeStatus(value: string | null | undefined): ApplicationStatus {
  const status = String(value ?? "").toLowerCase();
  if (status === "pending") return "applied";
  if (status === "waitlisted") return "reviewing";
  if (status === "approved") return "accepted";
  if (status === "applied") return "applied";
  if (status === "reviewing") return "reviewing";
  if (status === "invited_to_interview") return "invited_to_interview";
  if (status === "interview_confirmed") return "interview_confirmed";
  if (status === "accepted") return "accepted";
  if (status === "rejected") return "rejected";
  if (status === "participation_confirmed") return "participation_confirmed";
  return "applied";
}

function mapRowToApplicant(row: ApiApplicationRow): Applicant {
  const answers = toRecord(row.submission_answers);
  const location = ["location", "city", "state", "country"]
    .map((key) => answers[key])
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(", ");

  return {
    id: String(row.id),
    applicationId: row.id,
    createdUserId: typeof row.created_user_id === "number" ? row.created_user_id : null,
    cohortName: row.cohort_name?.trim() || "Unassigned cohort",
    name: row.full_name?.trim() || row.email?.trim() || "Unnamed applicant",
    email: row.email?.trim() || "No email",
    phone: row.phone?.trim() || "",
    appliedDate: row.submitted_at,
    status: normalizeStatus(row.status ?? row.stage),
    location,
    answers,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    reviewMessage: row.review_message,
    interviewStatus: typeof row.interview_status === "string" ? row.interview_status : null,
    interviewScheduledAt: typeof row.interview_scheduled_at === "string" ? row.interview_scheduled_at : null,
  };
}

function stageToken(status: ApplicationStatus): string {
  return status;
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return STATUSES.includes(value as ApplicationStatus);
}

function overviewFocusMessage(focus: string): string {
  switch (focus) {
    case "review_now":
      return "Overview shortcut: showing newly applied applications.";
    case "reviewing_over_3_days":
      return "Overview shortcut: showing reviewing applications (check items pending over 3 days).";
    case "pending_interview_confirmation":
      return "Overview shortcut: showing invited applicants pending interview confirmation.";
    case "decision_pending_after_interview":
      return "Overview shortcut: showing interview-confirmed applicants pending decision.";
    case "participation_pending":
      return "Overview shortcut: showing accepted applicants pending participation confirmation.";
    case "create_user":
      return "Overview shortcut: showing participation-confirmed applicants pending user creation.";
    case "schedule_interview":
      return "Overview shortcut: showing reviewing applications to schedule interviews.";
    case "reschedule_requests":
      return "Overview shortcut: showing interview reschedule requests.";
    default:
      return "Overview shortcut applied.";
  }
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4.5 3v-3H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 5h18l-7 8v5l-4 2v-7z" />
    </svg>
  );
}

function buildPageItems(totalPages: number, currentPage: number): Array<number | "ellipsis"> {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (pageValue) => pageValue === 1 || pageValue === totalPages || Math.abs(pageValue - currentPage) <= 1,
  );

  return pages.reduce<Array<number | "ellipsis">>((accumulator, pageValue, index) => {
    if (index > 0 && pageValue - pages[index - 1] > 1) accumulator.push("ellipsis");
    accumulator.push(pageValue);
    return accumulator;
  }, []);
}

type RowProps = {
  applicant: Applicant;
  isSelected: boolean;
  isUpdating: boolean;
  isCreatingUser: boolean;
  isUserCreated: boolean;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onCreateUser: (applicant: Applicant) => void;
  onOpenDetails: (applicant: Applicant) => void;
};

function ApplicantRow({
  applicant,
  isSelected,
  isUpdating,
  isCreatingUser,
  isUserCreated,
  onSelect,
  onStatusChange,
  onCreateUser,
  onOpenDetails,
}: RowProps) {
  const canCreateUser =
    (applicant.status === "accepted" || applicant.status === "participation_confirmed") &&
    !applicant.createdUserId;
  const shouldShowCreateUser =
    applicant.status === "accepted" ||
    applicant.status === "participation_confirmed" ||
    applicant.createdUserId !== null ||
    isUserCreated;

  return (
    <tr className={isSelected ? "admx-table-row admx-table-row--selected" : "admx-table-row"}>
      <td>
        <button className={isSelected ? "admx-check admx-check--active" : "admx-check"} type="button" onClick={() => onSelect(applicant.id)}>
          {isSelected ? "✓" : ""}
        </button>
      </td>
      <td>
        <button className="admx-name-btn" type="button" onClick={() => onOpenDetails(applicant)}>
          {applicant.name}
        </button>
      </td>
      <td>
        <p className="admx-date">{formatDate(applicant.appliedDate)}</p>
      </td>
      <td>
        <div className="admx-status">
          <label className={`admx-stage admx-stage-select-wrap admx-stage--${stageToken(applicant.status)}`}>
            <span className="admx-stage__dot" />
            <select
              className="admx-stage-select"
              value={applicant.status}
              onChange={(event) => onStatusChange(applicant.id, event.target.value as ApplicationStatus)}
              disabled={isUpdating}
              aria-label={`Update status for ${applicant.name}`}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <span className="admx-caret">▾</span>
          </label>
          {applicant.interviewScheduledAt &&
          (applicant.status === "invited_to_interview" || applicant.status === "interview_confirmed") ? (
            <span className="admx-subtext" title="Interview scheduled">
              {`📅 ${formatDate(applicant.interviewScheduledAt)}`}
              {applicant.interviewStatus === "reschedule_requested" ? " ⚠️ Reschedule requested" : ""}
              {applicant.interviewStatus === "confirmed" ? " ✓ Confirmed" : ""}
            </span>
          ) : null}
        </div>
      </td>
      <td>
        {shouldShowCreateUser ? (
          <div className="admx-row-actions">
            <button
              className="btn btn--secondary btn--sm admx-create-user-btn"
              type="button"
              disabled={isCreatingUser || isUpdating || isUserCreated || !canCreateUser}
              onClick={() => onCreateUser(applicant)}
              title={!canCreateUser && !isUserCreated ? "Create user is available after acceptance." : undefined}
            >
              {isUserCreated ? "User Created" : isCreatingUser ? "Creating..." : "Create User"}
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

type ComposerProps = {
  onClose: () => void;
  preselected: Applicant | null;
  applicants: Applicant[];
  selectedIds: string[];
  templates: MessageTemplate[];
  busy: boolean;
  onSend: (input: {
    recipients: Applicant[];
    channel: "email" | "sms";
    subject: string;
    body: string;
  }) => void;
};

type InterviewSchedulerProps = {
  applicant: Applicant | null;
  busy: boolean;
  initial: {
    scheduled_at: string;
    duration_minutes: number;
    location_type: InterviewLocationType;
    location_details: string;
  };
  onClose: () => void;
  onSubmit: (input: {
    scheduled_at: string;
    duration_minutes: number;
    location_type: InterviewLocationType;
    location_details: string;
  }) => void;
};

function InterviewSchedulerModal({ applicant, busy, initial, onClose, onSubmit }: InterviewSchedulerProps) {
  const [scheduledAt, setScheduledAt] = useState(initial.scheduled_at);
  const [durationMinutes, setDurationMinutes] = useState(initial.duration_minutes);
  const [locationType, setLocationType] = useState<InterviewLocationType>(initial.location_type);
  const [locationDetails, setLocationDetails] = useState(initial.location_details);

  if (!applicant) return null;

  return (
    <div className="admx-modal" role="presentation">
      <div className="admx-modal__backdrop" onClick={onClose} />
      <div className="admx-modal__card" role="dialog" aria-modal="true">
        <header className="admx-modal__header">
          <div>
            <h3>Schedule Interview</h3>
            <p>{applicant.name}</p>
          </div>
        </header>
        <div className="admx-modal__body">
          <div className="form-grid form-grid--two">
            <label className="field">
              <span className="field__label">Interview Date/Time</span>
              <input
                className="field__control"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Duration (minutes)</span>
              <input
                className="field__control"
                type="number"
                min={5}
                max={240}
                step={5}
                value={String(durationMinutes)}
                onChange={(event) => setDurationMinutes(Number(event.target.value) || 30)}
              />
            </label>
            <label className="field">
              <span className="field__label">Location Type</span>
              <select
                className="field__control"
                value={locationType}
                onChange={(event) => setLocationType(event.target.value as InterviewLocationType)}
              >
                <option value="online">online</option>
                <option value="in_person">in_person</option>
                <option value="phone">phone</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Location Details</span>
              <input
                className="field__control"
                value={locationDetails}
                onChange={(event) => setLocationDetails(event.target.value)}
                placeholder="Google Meet / Office / Phone number"
              />
            </label>
          </div>
        </div>
        <footer className="admx-modal__footer">
          <button className="btn btn--secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn btn--primary"
            type="button"
            disabled={busy || !scheduledAt}
            onClick={() => onSubmit({
              scheduled_at: scheduledAt,
              duration_minutes: durationMinutes,
              location_type: locationType,
              location_details: locationDetails.trim(),
            })}
          >
            {busy ? "Scheduling interview..." : "Schedule Interview"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function MessageComposer({ onClose, preselected, applicants, selectedIds, templates, busy, onSend }: ComposerProps) {
  const [group, setGroup] = useState<RecipientGroup>(preselected ? "individual" : selectedIds.length ? "selected" : "all");
  const [single, setSingle] = useState<Applicant | null>(preselected);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [showTemplates, setShowTemplates] = useState(false);

  const recipients = useMemo(() => {
    if (group === "individual") return single ? [single] : [];
    if (group === "selected") return applicants.filter((a) => selectedIds.includes(a.id));
    if (group === "all") return applicants;
    return applicants.filter((a) => a.status === group);
  }, [group, single, applicants, selectedIds]);
  const visibleTemplates = useMemo(() => filterTemplatesForChannel(templates, channel), [templates, channel]);

  const canSend = recipients.length > 0 && body.trim() && (channel === "sms" || subject.trim());

  return (
    <div className="admx-modal" role="presentation">
      <div className="admx-modal__backdrop" onClick={onClose} />
      <div className="admx-modal__card" role="dialog" aria-modal="true">
        <header className="admx-modal__header">
          <div>
            <h3>Compose Message</h3>
            <p>{recipients.length} recipient{recipients.length === 1 ? "" : "s"}</p>
          </div>
          <div className="admx-switch">
            <button className={channel === "email" ? "admx-switch__btn admx-switch__btn--active" : "admx-switch__btn"} type="button" onClick={() => setChannel("email")}>Email</button>
            <button className={channel === "sms" ? "admx-switch__btn admx-switch__btn--active" : "admx-switch__btn"} type="button" onClick={() => setChannel("sms")}>WhatsApp</button>
          </div>
        </header>
        <div className="admx-modal__body">
          <label className="admx-label">Send To</label>
          <div className="admx-chip-row">
            <button className={group === "individual" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setGroup("individual")}>Individual</button>
            <button className={group === "selected" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setGroup("selected")}>Selected ({selectedIds.length})</button>
            <button className={group === "all" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setGroup("all")}>All ({applicants.length})</button>
            {STATUSES.map((status) => (
              <button key={status} className={group === status ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setGroup(status)}>{status}</button>
            ))}
          </div>

          {group === "individual" ? (
            <select className="field__control" value={single?.id ?? ""} onChange={(event) => setSingle(applicants.find((a) => a.id === event.target.value) ?? null)}>
              <option value="">Select applicant...</option>
              {applicants.map((a) => (
                <option key={a.id} value={a.id}>{a.name} | {a.cohortName}</option>
              ))}
            </select>
          ) : null}

          {channel === "email" ? (
            <input className="field__control" type="text" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
          ) : null}

          <div className="admx-inline-head">
            <span className="admx-label">Message</span>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setShowTemplates((v) => !v)}>Templates</button>
          </div>

                  {showTemplates ? (
                    <div className="admx-template-grid">
                      {visibleTemplates.map((template) => (
                        <button
                          key={template.key}
                          className="admx-template"
                          type="button"
                          onClick={() => {
                            const tokens: Record<string, string> = {};
                            if (recipients.length === 1) {
                              tokens.name = recipients[0].name.split(" ")[0];
                            }
                            setSubject(applyTemplateTokens(template.subject || template.label, tokens));
                            setBody(applyTemplateTokens(template.body, tokens));
                            setShowTemplates(false);
                          }}
                        >
                          {template.label}
                        </button>
              ))}
            </div>
          ) : null}

          <textarea className="textarea-control" rows={channel === "sms" ? 4 : 8} value={body} onChange={(event) => setBody(event.target.value)} />
        </div>
        <footer className="admx-modal__footer">
          <button className="btn btn--secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn btn--primary"
            type="button"
            disabled={!canSend || busy}
            onClick={() => onSend({ recipients, channel, subject, body })}
          >
            {busy ? "Sending..." : `Send to ${recipients.length || "-"}`}
          </button>
        </footer>
      </div>
    </div>
  );
}

type CreateUserDeliveryModalProps = {
  open: boolean;
  label: string;
  recipients: Applicant[];
  initialChannels: CreateUserDeliveryChannels;
  busy: boolean;
  onClose: () => void;
  onSubmit: (channels: CreateUserDeliveryChannels) => void;
  onInvalidSubmit: () => void;
};

function CreateUserDeliveryModal({
  open,
  label,
  recipients,
  initialChannels,
  busy,
  onClose,
  onSubmit,
  onInvalidSubmit,
}: CreateUserDeliveryModalProps) {
  const [emailEnabled, setEmailEnabled] = useState(initialChannels.email);
  const [smsEnabled, setSmsEnabled] = useState(initialChannels.sms);

  if (!open) return null;

  const emailCount = recipients.filter((entry) => hasDeliverableEmail(entry.email)).length;
  const phoneCount = recipients.filter((entry) => entry.phone.trim().length > 0).length;
  const canSubmit = emailEnabled || smsEnabled;

  return (
    <div className="admx-modal" role="presentation">
      <div className="admx-modal__backdrop" onClick={busy ? undefined : onClose} />
      <div className="admx-modal__card" role="dialog" aria-modal="true">
        <header className="admx-modal__header">
          <div>
            <h3>Create User</h3>
            <p>{label}</p>
          </div>
        </header>
        <div className="admx-modal__body">
          <p className="admx-subtext">
            Select how credentials should be delivered after account creation.
          </p>
          <div className="admx-channel-list">
            <label className="admx-channel-option">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(event) => setEmailEnabled(event.target.checked)}
                disabled={busy}
              />
              <span>
                <strong>Email</strong>
                <small>{emailCount} recipient{emailCount === 1 ? "" : "s"} with valid email</small>
              </span>
            </label>
            <label className="admx-channel-option">
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(event) => setSmsEnabled(event.target.checked)}
                disabled={busy}
              />
              <span>
                <strong>WhatsApp</strong>
                <small>{phoneCount} recipient{phoneCount === 1 ? "" : "s"} with phone number</small>
              </span>
            </label>
          </div>
        </div>
        <footer className="admx-modal__footer">
          <button className="btn btn--secondary btn--sm" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn--primary btn--sm"
            type="button"
            disabled={busy}
            onClick={() => {
              if (!canSubmit) {
                onInvalidSubmit();
                return;
              }
              onSubmit({ email: emailEnabled, sms: smsEnabled });
            }}
          >
            {busy ? "Creating..." : "Create User"}
          </button>
        </footer>
      </div>
    </div>
  );
}

type DetailsProps = {
  open: boolean;
  applicant: Applicant | null;
  pipeline: ApplicationPipelineResponse | null;
  loading: boolean;
  savingReviewMessage: boolean;
  actionBusy: boolean;
  reviewMessageDraft: string;
  onMessageApplicant: (applicant: Applicant) => void;
  onReviewMessageDraftChange: (value: string) => void;
  onSaveReviewMessage: (applicant: Applicant, message: string) => void;
  onReopenApplication: (applicant: Applicant) => void;
  onResendAcceptance: (applicant: Applicant) => void;
  onClose: () => void;
};

function DetailsModal({
  open,
  applicant,
  pipeline,
  loading,
  savingReviewMessage,
  actionBusy,
  reviewMessageDraft,
  onMessageApplicant,
  onReviewMessageDraftChange,
  onSaveReviewMessage,
  onReopenApplication,
  onResendAcceptance,
  onClose,
}: DetailsProps) {
  const app = pipeline?.application;
  const interview = toRecord(pipeline?.interview);
  const reviewMessage = String(app?.review_message || applicant?.reviewMessage || "").trim();

  if (!open || !applicant) return null;

  const pipelineAnswers = toRecord(app?.submission_answers);
  const answers = Object.keys(pipelineAnswers).length ? pipelineAnswers : applicant.answers;
  const submittedEntries = Object.entries(answers)
    .filter(([, value]) => hasSubmittedValue(value))
    .map(([key, value]) => ({
      key,
      label: toSubmittedLabel(key),
      value: formatUnknownValue(value),
    }));
  const applicantName = applicant.name || "Applicant";
  const applicantEmail = app?.email || applicant.email || "N/A";
  const cohortName = app?.cohort_name || applicant.cohortName || "Unassigned cohort";
  const currentStatus = normalizeStatus(app?.status || app?.stage || applicant.status);
  const interviewStatus =
    (typeof interview.status === "string" && interview.status.trim()) ||
    applicant.interviewStatus ||
    "";
  const applicantPhone = String(app?.phone || applicant.phone || "").trim();
  const reviewedAt = app?.reviewed_at;
  const showResendAcceptance = currentStatus === "accepted" || currentStatus === "participation_confirmed";
  const showReopenAction = currentStatus === "rejected";

  const trimmedDraft = reviewMessageDraft.trim();
  const canSaveReviewMessage = !loading && !savingReviewMessage && trimmedDraft.length > 0 && trimmedDraft !== reviewMessage;

  return (
    <div className="admx-modal" role="presentation">
      <div className="admx-modal__backdrop" onClick={onClose} />
      <div className="admx-modal__card" role="dialog" aria-modal="true">
        <header className="admx-modal__header">
          <div>
            <h3>{applicantName}</h3>
            <p>{applicantEmail} • {cohortName}</p>
          </div>
          <div className="admx-modal__header-actions">
            {showReopenAction ? (
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={() => onReopenApplication(applicant)}
                disabled={loading || actionBusy}
              >
                {actionBusy ? "Working..." : "Reopen Application"}
              </button>
            ) : null}
            {showResendAcceptance ? (
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={() => onResendAcceptance(applicant)}
                disabled={loading || actionBusy}
              >
                {actionBusy ? "Sending..." : "Resend Acceptance"}
              </button>
            ) : null}
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => onMessageApplicant(applicant)}>
              Message Applicant
            </button>
            <button className="btn btn--secondary btn--sm" type="button" onClick={onClose}>Close</button>
          </div>
        </header>
        <div className="admx-modal__body">
          {loading ? <PulseDots layout="inline" label="Loading details" /> : null}

          <p className="admx-details-title">Application Summary</p>
          <p className="admx-details-line"><strong>Email:</strong> {applicantEmail}</p>
          {applicantPhone ? <p className="admx-details-line"><strong>Phone:</strong> {applicantPhone}</p> : null}
          <p className="admx-details-line"><strong>Status:</strong> {workflowStatusLabel(currentStatus, { confirmedLabel: "Confirmed" })}</p>
          {interviewStatus ? (
            <p className="admx-details-line">
              <strong>Interview Status:</strong> {interviewStatus.replaceAll("_", " ")}
            </p>
          ) : null}
          <p className="admx-details-line"><strong>Submitted:</strong> {formatDate(app?.submitted_at || applicant.appliedDate)}</p>
          <p className="admx-details-line"><strong>Reviewed:</strong> {reviewedAt ? formatDate(reviewedAt) : "Not reviewed yet"}</p>
          <div className="admx-inline-head">
            <p className="admx-details-title">Review Message</p>
            <button
              className="btn btn--secondary btn--sm"
              type="button"
              disabled={!canSaveReviewMessage}
              onClick={() => onSaveReviewMessage(applicant, trimmedDraft)}
            >
              {savingReviewMessage ? "Saving..." : "Save"}
            </button>
          </div>
          <textarea
            className="textarea-control"
            rows={3}
            value={reviewMessageDraft}
            onChange={(event) => onReviewMessageDraftChange(event.target.value)}
            placeholder="Add review feedback for this application."
          />

          {!loading && submittedEntries.length ? (
            <>
              <p className="admx-details-title">Submitted Information</p>
              <div className="popapply-submitted-list">
                {submittedEntries.map((entry) => (
                  <div key={entry.key} className="popapply-submitted-item">
                    <p className="popapply-submitted-label">{entry.label}</p>
                    <p className="popapply-submitted-value">{entry.value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdmissionsPage() {
  const { setPageData: setGlobalMessagingPageData } = useGlobalMessagingContext();
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();
  const [searchParams] = useSearchParams();
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [cohortDropdownOpen, setCohortDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [composerOpen, setComposerOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<Applicant | null>(null);
  const [composerBusy, setComposerBusy] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(FALLBACK_MESSAGE_TEMPLATES);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [existingUserEmails, setExistingUserEmails] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingCohorts, setLoadingCohorts] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [showRescheduleOnly, setShowRescheduleOnly] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [creatingUserIds, setCreatingUserIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus | "">("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkCreatingUsers, setBulkCreatingUsers] = useState(false);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [schedulerTarget, setSchedulerTarget] = useState<Applicant | null>(null);
  const [schedulerBusy, setSchedulerBusy] = useState(false);
  const [schedulerInitial, setSchedulerInitial] = useState({
    scheduled_at: "",
    duration_minutes: 30,
    location_type: "online" as InterviewLocationType,
    location_details: "",
  });
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [createUserTargets, setCreateUserTargets] = useState<Applicant[]>([]);
  const [createUserLabel, setCreateUserLabel] = useState("");
  const [createUserInitialChannels, setCreateUserInitialChannels] = useState<CreateUserDeliveryChannels>({
    email: true,
    sms: true,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<Applicant | null>(null);
  const [detailsPipeline, setDetailsPipeline] = useState<ApplicationPipelineResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [savingReviewMessage, setSavingReviewMessage] = useState(false);
  const [detailsActionBusy, setDetailsActionBusy] = useState(false);
  const [detailsReviewMessageDraft, setDetailsReviewMessageDraft] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const overviewNavigationRef = useRef(false);
  const overviewFallbackAttemptedRef = useRef(false);
  const overviewTargetStageRef = useRef<ApplicationStatus | null>(null);
  const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const requestConfirmation = (title: string, message: string) =>
    new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ title, message });
    });

  const closeConfirmation = (confirmed: boolean) => {
    setConfirmState(null);
    confirmResolverRef.current?.(confirmed);
    confirmResolverRef.current = null;
  };

  useEffect(() => {
    const stageParam = String(searchParams.get("stage") || "").trim().toLowerCase();
    const sourceParam = String(searchParams.get("source") || "").trim().toLowerCase();
    const focusParam = String(searchParams.get("focus") || "").trim().toLowerCase();
    const cohortIdParam = String(searchParams.get("cohort_id") || "").trim();
    const searchParam = searchParams.get("search");
    overviewNavigationRef.current = sourceParam === "overview";
    overviewFallbackAttemptedRef.current = false;
    overviewTargetStageRef.current = stageParam && stageParam !== "all" && isApplicationStatus(stageParam) ? stageParam : null;

    if (stageParam === "all") {
      setActiveTab("All");
    } else if (stageParam && isApplicationStatus(stageParam)) {
      setActiveTab(stageParam);
    }

    if (cohortIdParam) {
      setSelectedCohortId(cohortIdParam);
    }

    if (typeof searchParam === "string") {
      setSearchQuery(searchParam);
    }

    if (sourceParam === "overview") {
      setShowRescheduleOnly(focusParam === "reschedule_requests");
      pushToast("success", overviewFocusMessage(focusParam));
      setSelectedIds(new Set());
      setCurrentPage(1);
      setFilterPanelOpen(false);
    }
  }, [pushToast, searchParams]);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setGlobalMessagingPageData({
      scope: "applications",
      recipients: applicants.map((entry) => ({
        id: entry.id,
        name: entry.name,
        email: entry.email === "No email" ? "" : entry.email,
        phone: entry.phone || "",
        status: entry.status,
        meta: entry.cohortName,
      })),
      selectedRecipientIds: [...selectedIds],
      statusOptions: [...STATUSES],
    });

    return () => setGlobalMessagingPageData(null);
  }, [applicants, selectedIds, setGlobalMessagingPageData]);

  useEffect(() => {
    let active = true;

    const loadExistingUsers = async () => {
      try {
        const emails = new Set<string>();
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          const response = await listMessagingUsers({
            page,
            limit: 200,
            sortBy: "created_at",
            order: "desc",
          });

          response.data.forEach((user) => {
            const normalized = normalizeEmail(user.email);
            if (normalized) emails.add(normalized);
          });

          totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
          page += 1;
        }

        if (!active) return;
        setExistingUserEmails(emails);
      } catch {
        if (!active) return;
        setExistingUserEmails(new Set());
      }
    };

    void loadExistingUsers();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setCohortDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingCohorts(true);
      try {
        const result = await apiList<CohortOption>(`/cohorts${buildQueryString({ limit: 100, sortBy: "updated_at", order: "desc" })}`);
        if (!active) return;
        setCohorts(result.data);
        setSelectedCohortId((current) => current || getStoredAdmissionsCohortId() || (result.data[0] ? String(result.data[0].id) : ""));
      } catch (err) {
        if (!active) return;
        pushToast("error", err instanceof ApiError ? err.message : "Failed to load cohorts.");
      } finally {
        if (active) setLoadingCohorts(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [pushToast]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await listMessageTemplates({ limit: 100, sortBy: "sort_order", order: "asc" });
        if (!active) return;
        const data = result.data;
        setMessageTemplates(data.length ? data : FALLBACK_MESSAGE_TEMPLATES);
      } catch {
        if (!active) return;
        setMessageTemplates(FALLBACK_MESSAGE_TEMPLATES);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!selectedCohortId) {
        setApplicants([]);
        return;
      }
      setLoadingApplications(true);
      try {
        const result = await apiList<ApiApplicationRow>(`/applications${buildQueryString({ cohort_id: Number(selectedCohortId), limit: 100, sortBy: "submitted_at", order: "desc" })}`);
        if (!active) return;
        const mapped = result.data.map(mapRowToApplicant);
        const targetStage = overviewTargetStageRef.current;
        const hasTargetRecords = targetStage ? mapped.some((entry) => entry.status === targetStage) : mapped.length > 0;

        if (
          overviewNavigationRef.current &&
          !hasTargetRecords &&
          cohorts.length > 1 &&
          !overviewFallbackAttemptedRef.current
        ) {
          overviewFallbackAttemptedRef.current = true;

          for (const cohort of cohorts) {
            if (String(cohort.id) === selectedCohortId) continue;
            try {
              const probe = await apiList<ApiApplicationRow>(
                `/applications${buildQueryString({
                  cohort_id: cohort.id,
                  limit: 3,
                  sortBy: "submitted_at",
                  order: "desc",
                  stage: targetStage ?? undefined,
                })}`,
              );
              if (!active) return;
              const probeMapped = probe.data.map(mapRowToApplicant);
              const probeHasTarget = targetStage
                ? probeMapped.some((entry) => entry.status === targetStage)
                : probeMapped.length > 0;
              if (probeHasTarget) {
                setSelectedCohortId(String(cohort.id));
                pushToast(
                  "success",
                  targetStage
                    ? `Overview shortcut: switched to a cohort with '${workflowStatusLabel(targetStage, { confirmedLabel: "Confirmed" })}' applications.`
                    : "Overview shortcut: switched to a cohort with active applications.",
                );
                return;
              }
            } catch {
              // Ignore probe failures and continue to next cohort.
            }
          }
        }

        if (overviewNavigationRef.current && hasTargetRecords) {
          overviewNavigationRef.current = false;
        }

        setApplicants(mapped);
      } catch (err) {
        if (!active) return;
        pushToast("error", err instanceof ApiError ? err.message : "Failed to load applications.");
      } finally {
        if (active) setLoadingApplications(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [cohorts, pushToast, selectedCohortId]);

  useEffect(() => {
    if (!selectedCohortId) return;
    localStorage.setItem(LAST_ADMISSIONS_COHORT_KEY, selectedCohortId);
  }, [selectedCohortId]);

  const selectedCohort = cohorts.find((cohort) => String(cohort.id) === selectedCohortId) ?? null;
  const cohortName = selectedCohort?.name || "Select cohort";

  const tabs = useMemo(() => {
    return [{ id: "All" as const, label: "All", count: applicants.length }, ...STATUSES.map((status) => ({ id: status as TabId, label: status, count: applicants.filter((a) => a.status === status).length }))];
  }, [applicants]);

  const rescheduleRequestedCount = useMemo(
    () => applicants.filter((applicant) => applicant.interviewStatus === "reschedule_requested").length,
    [applicants],
  );

  const filtered = useMemo(() => {
    let list = activeTab === "All" ? applicants : applicants.filter((a) => a.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.location.toLowerCase().includes(q));
    }
    if (filters.stages.length) list = list.filter((a) => filters.stages.includes(a.status));
    if (showRescheduleOnly) list = list.filter((a) => a.interviewStatus === "reschedule_requested");
    if (filters.dateFrom) list = list.filter((a) => a.appliedDate >= filters.dateFrom);
    if (filters.dateTo) list = list.filter((a) => a.appliedDate <= filters.dateTo);
    if (filters.location.trim()) list = list.filter((a) => a.location.toLowerCase().includes(filters.location.toLowerCase()));

    return [...list].sort((a, b) => {
      const dir = filters.sortDirection === "asc" ? 1 : -1;
      if (filters.sortField === "name") return a.name.localeCompare(b.name) * dir;
      if (filters.sortField === "status") return (STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)) * dir;
      return a.appliedDate.localeCompare(b.appliedDate) * dir;
    });
  }, [activeTab, applicants, searchQuery, filters, showRescheduleOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, filtered.length);
  const allVisibleSelected = paginated.length > 0 && paginated.every((a) => selectedIds.has(a.id));
  const someSelected = selectedIds.size > 0;
  const selectedApplicants = useMemo(
    () => applicants.filter((entry) => selectedIds.has(entry.id)),
    [applicants, selectedIds],
  );
  const selectedCreateEligibleCount = useMemo(
    () =>
      selectedApplicants.filter(
        (entry) =>
          !applicantHasUser(entry, existingUserEmails) &&
          (entry.status === "accepted" || entry.status === "participation_confirmed"),
      ).length,
    [existingUserEmails, selectedApplicants],
  );
  const createUserModalBusy =
    bulkCreatingUsers || createUserTargets.some((entry) => creatingUserIds.has(entry.applicationId));
  const selectedExportRows = useMemo(
    () => filtered.filter((applicant) => selectedIds.has(applicant.id)),
    [filtered, selectedIds],
  );
  const csvColumns = useMemo<CsvExportColumn<Applicant>[]>(
    () => [
      { key: "name", label: "Applicant", getValue: (row) => row.name },
      { key: "email", label: "Email", getValue: (row) => row.email },
      { key: "phone", label: "Phone", getValue: (row) => row.phone },
      { key: "cohort", label: "Cohort", getValue: (row) => row.cohortName },
      { key: "applied_date", label: "Applied", getValue: (row) => formatDate(row.appliedDate) },
      { key: "status", label: "Status", getValue: (row) => workflowStatusLabel(row.status, { confirmedLabel: "Confirmed" }) },
      { key: "location", label: "Location", getValue: (row) => row.location },
    ],
    [],
  );
  const csvRowScopes = useMemo(
    () => [
      { id: "visible", label: "Visible Page", rows: paginated, default: true },
      { id: "filtered", label: "Filtered", rows: filtered },
      { id: "selected", label: "Selected", rows: selectedExportRows },
    ],
    [filtered, paginated, selectedExportRows],
  );

  useEffect(() => {
    if (!someSelected) setBulkStatus("");
  }, [someSelected]);

  const openScheduler = (applicant: Applicant) => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 24);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);

    setSchedulerTarget(applicant);
    setSchedulerInitial({
      scheduled_at: local,
      duration_minutes: 30,
      location_type: "online",
      location_details: "",
    });
    setSchedulerOpen(true);
  };

  const closeScheduler = (force = false) => {
    if (schedulerBusy && !force) return;
    setSchedulerOpen(false);
    setSchedulerTarget(null);
  };

  const submitScheduler = async (input: {
    scheduled_at: string;
    duration_minutes: number;
    location_type: InterviewLocationType;
    location_details: string;
  }) => {
    if (!schedulerTarget) return;

    const hasEmail = Boolean(schedulerTarget.email && schedulerTarget.email !== "No email");
    const hasPhone = Boolean(schedulerTarget.phone?.trim());

    setSchedulerBusy(true);
    try {
      await scheduleApplicationInterview(schedulerTarget.applicationId, {
        scheduled_at: toIsoDateTime(input.scheduled_at),
        duration_minutes: input.duration_minutes,
        location_type: input.location_type,
        location_details: input.location_details || undefined,
        send_email: Boolean(hasEmail),
        send_phone: hasPhone,
      });

      setApplicants((current) =>
        current.map((entry) =>
          entry.id === schedulerTarget.id
            ? {
                ...entry,
                status: "invited_to_interview",
                interviewScheduledAt: toIsoDateTime(input.scheduled_at),
                interviewStatus: "pending_confirmation",
              }
            : entry,
        ),
      );

      if (detailsOpen && detailsTarget?.id === schedulerTarget.id) {
        await openDetails(schedulerTarget);
      }
      pushToast("success", buildInterviewScheduleFeedback(schedulerTarget.name, hasEmail, hasPhone));
      closeScheduler(true);
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to schedule interview.");
    } finally {
      setSchedulerBusy(false);
    }
  };

  const updateStatus = async (
    applicant: Applicant,
    status: ApplicationStatus,
    skipConfirmation = false,
  ): Promise<ApplicationStatus> => {
    const transitionWarning = getSkippedStageTransitionWarning(applicant.status, status, {
      confirmedLabel: "Confirmed",
    });
    if (!skipConfirmation && transitionWarning) {
      const confirmed = await requestConfirmation(
        "Confirm Stage Skip",
        `${transitionWarning}\n\nDo you want to continue?`,
      );
      if (!confirmed) {
        return applicant.status;
      }
    }

    if (status === "invited_to_interview") {
      openScheduler(applicant);
      return applicant.status;
    }
    if (status === "interview_confirmed") {
      await markApplicationInterviewCompleted(applicant.applicationId);
      return "interview_confirmed";
    }
    await api(`/applications/${applicant.applicationId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ status, force_transition: Boolean(transitionWarning) }),
    });
    return status;
  };

  const onStatusChange = async (id: string, status: ApplicationStatus) => {
    const target = applicants.find((a) => a.id === id);
    if (!target) return;
    setUpdatingIds((current) => new Set(current).add(target.applicationId));
    try {
      const nextStatus = await updateStatus(target, status);
      setApplicants((current) => current.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)));
      if (nextStatus !== target.status) {
        pushToast("success", `${target.name} moved to ${workflowStatusLabel(nextStatus, { confirmedLabel: "Confirmed" })}.`);
      }
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(target.applicationId);
        return next;
      });
    }
  };

  const onBulkStageChange = async (status: ApplicationStatus) => {
    const targets = applicants.filter((a) => selectedIds.has(a.id));
    if (targets.length === 0) return;
    if (status === "invited_to_interview") {
      pushToast("error", "Bulk update to 'Invited to Interview' requires scheduling each interview individually.");
      return;
    }

    const skippedTargets = targets.filter((applicant) =>
      Boolean(
        getSkippedStageTransitionWarning(applicant.status, status, {
          confirmedLabel: "Confirmed",
        }),
      ),
    );
    if (
      skippedTargets.length > 0 &&
      !(await requestConfirmation(
        "Confirm Bulk Stage Skip",
        `This will skip the normal pipeline for ${skippedTargets.length} selected applicant${
          skippedTargets.length === 1 ? "" : "s"
        } and move them directly to ${workflowStatusLabel(status, {
          confirmedLabel: "Confirmed",
        })}.\n\nDo you want to continue?`,
      ))
    ) {
      return;
    }

    const results = await Promise.allSettled(targets.map((a) => updateStatus(a, status, skippedTargets.length > 0)));
    const successIds = targets.filter((_a, i) => results[i].status === "fulfilled").map((a) => a.id);

    if (successIds.length > 0) {
      setApplicants((current) => current.map((a) => (successIds.includes(a.id) ? { ...a, status } : a)));
      setSelectedIds((current) => {
        const next = new Set(current);
        successIds.forEach((id) => next.delete(id));
        return next;
      });
      pushToast(
        "success",
        `${successIds.length} applicant${successIds.length === 1 ? "" : "s"} moved to ${workflowStatusLabel(status, {
          confirmedLabel: "Confirmed",
        })}.`,
      );
    }

    const firstFailed = results.find((result) => result.status === "rejected");
    if (firstFailed && firstFailed.status === "rejected") {
      const reason = firstFailed.reason;
      pushToast("error", reason instanceof ApiError ? reason.message : "Some status updates failed.");
    }
  };

  const applyBulkStageChange = async () => {
    if (!bulkStatus || bulkApplying) return;
    setBulkApplying(true);
    try {
      await onBulkStageChange(bulkStatus);
    } finally {
      setBulkApplying(false);
      setBulkStatus("");
    }
  };

  const openCreateUserModal = (targets: Applicant[], label: string) => {
    const eligibleTargets = targets.filter(
      (entry) =>
        !applicantHasUser(entry, existingUserEmails) &&
        (entry.status === "accepted" || entry.status === "participation_confirmed"),
    );
    if (!eligibleTargets.length) {
      pushToast("error", "Create user is only available for accepted or participation-confirmed applicants without accounts.");
      return;
    }
    const emailAvailable = eligibleTargets.some((entry) => hasDeliverableEmail(entry.email));
    const phoneAvailable = eligibleTargets.some((entry) => entry.phone.trim().length > 0);
    setCreateUserTargets(eligibleTargets);
    setCreateUserLabel(label);
    setCreateUserInitialChannels({
      email: emailAvailable || !phoneAvailable,
      sms: phoneAvailable,
    });
    setCreateUserModalOpen(true);
  };

  const closeCreateUserModal = () => {
    if (createUserModalBusy) return;
    setCreateUserModalOpen(false);
    setCreateUserTargets([]);
    setCreateUserLabel("");
  };

  const createUserForApplicant = async (
    applicant: Applicant,
    channels?: CreateUserDeliveryChannels,
  ) => {
    setCreatingUserIds((current) => new Set(current).add(applicant.applicationId));
    try {
      const response = await createUserFromApplication(applicant.applicationId, {
        channels: {
          email: channels?.email,
          sms: channels?.sms,
        },
      });
      const createdUserId = Number((response as { student_user_id?: unknown }).student_user_id);
      if (Number.isFinite(createdUserId) && createdUserId > 0) {
        setApplicants((current) =>
          current.map((entry) =>
            entry.applicationId === applicant.applicationId ? { ...entry, createdUserId } : entry,
          ),
        );
      }
      const normalizedApplicantEmail = normalizeEmail(applicant.email);
      if (normalizedApplicantEmail) {
        setExistingUserEmails((current) => {
          const next = new Set(current);
          next.add(normalizedApplicantEmail);
          return next;
        });
      }
      const existingUser = Boolean((response as { existing_user?: unknown }).existing_user);
      const summary = summarizeOnboardingMessage(response);
      const extras: string[] = [];
      if (summary.sentCount > 0) extras.push(`credentials sent (${summary.sentCount})`);
      if (summary.skipped) extras.push(onboardingSkipReasonText(summary.reason));
      pushToast(
        "success",
        extras.length
          ? `${existingUser ? "Existing account linked" : "User created"} for ${applicant.name}; ${extras.join(", ")}.`
          : `${existingUser ? "Existing account linked" : "User created"} for ${applicant.name}.`,
      );
      if (summary.failedCount > 0) {
        const firstFailure = summary.firstFailure ? toFriendlyDeliveryFailure(summary.firstFailure) : "";
        pushToast(
          "error",
          `${existingUser ? "Account linked" : "User created"}, but ${summary.failedCount} credential message${summary.failedCount === 1 ? "" : "s"} failed.${firstFailure ? ` ${firstFailure}` : ""}`,
        );
      }
    } catch (error) {
      pushToast("error", toFriendlyCreateUserError(error, applicant.name));
    } finally {
      setCreatingUserIds((current) => {
        const next = new Set(current);
        next.delete(applicant.applicationId);
        return next;
      });
    }
  };

  const createUsers = async (
    targets: Applicant[],
    channels?: CreateUserDeliveryChannels,
  ) => {
    if (!targets.length || bulkCreatingUsers) return;

    setBulkCreatingUsers(true);
    try {
      const results = await Promise.allSettled(
        targets.map((applicant) =>
          createUserFromApplication(applicant.applicationId, {
            channels: {
              email: channels?.email,
              sms: channels?.sms,
            },
          }),
        ),
      );
      const createdMap = new Map<number, number>();
      results.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const createdUserId = Number((result.value as { student_user_id?: unknown }).student_user_id);
        if (!Number.isFinite(createdUserId) || createdUserId <= 0) return;
        createdMap.set(targets[index].applicationId, createdUserId);
      });
      if (createdMap.size > 0) {
        setApplicants((current) =>
          current.map((entry) => ({
            ...entry,
            createdUserId: createdMap.get(entry.applicationId) ?? entry.createdUserId,
          })),
        );
      }
      setExistingUserEmails((current) => {
        const next = new Set(current);
        results.forEach((result, index) => {
          if (result.status !== "fulfilled") return;
          const normalizedApplicantEmail = normalizeEmail(targets[index]?.email);
          if (normalizedApplicantEmail) next.add(normalizedApplicantEmail);
        });
        return next;
      });
      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.filter((result) => result.status === "rejected");
      const summaries = results
        .filter((result): result is PromiseFulfilledResult<Record<string, unknown>> => result.status === "fulfilled")
        .map((result) => summarizeOnboardingMessage(result.value));
      const sentCount = summaries.reduce((acc, item) => acc + item.sentCount, 0);
      const deliveryFailedCount = summaries.reduce((acc, item) => acc + item.failedCount, 0);
      const skippedCount = summaries.reduce((acc, item) => acc + (item.skipped ? 1 : 0), 0);
      const firstDeliveryFailure = summaries.find((item) => item.firstFailure)?.firstFailure || "";
      const skippedReasonCounts = summaries.reduce<Record<string, number>>((acc, item) => {
        if (!item.skipped) return acc;
        const key = item.reason || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      if (successCount > 0) {
        const parts = [`Created ${successCount} user${successCount === 1 ? "" : "s"}.`];
        if (sentCount > 0) parts.push(`Credentials sent: ${sentCount}.`);
        if (skippedCount > 0) {
          const skippedReasonText = Object.entries(skippedReasonCounts)
            .map(([reason, count]) => `${onboardingSkipReasonText(reason)} (${count})`)
            .join(" ");
          parts.push(`Delivery skipped: ${skippedCount}.${skippedReasonText ? ` ${skippedReasonText}` : ""}`);
        }
        pushToast("success", parts.join(" "));
      }

      if (failed.length || deliveryFailedCount > 0) {
        const messages: string[] = [];
        if (failed.length) {
          const firstReason = failed[0].status === "rejected" ? failed[0].reason : null;
          const reasonText = toFriendlyCreateUserError(firstReason, "One or more selected applicants");
          messages.push(`${failed.length} user create request${failed.length === 1 ? "" : "s"} failed. ${reasonText}`);
        }
        if (deliveryFailedCount > 0) {
          const friendlyFailure = firstDeliveryFailure ? toFriendlyDeliveryFailure(firstDeliveryFailure) : "";
          messages.push(
            `${deliveryFailedCount} credential message${deliveryFailedCount === 1 ? "" : "s"} failed.${friendlyFailure ? ` ${friendlyFailure}` : ""}`,
          );
        }
        pushToast("error", messages.join(" "));
      }
    } finally {
      setBulkCreatingUsers(false);
    }
  };

  const submitCreateUserModal = async (channels: CreateUserDeliveryChannels) => {
    if (!createUserTargets.length) return;
    if (createUserTargets.length === 1) {
      await createUserForApplicant(createUserTargets[0], channels);
    } else {
      await createUsers(createUserTargets, channels);
    }
    closeCreateUserModal();
  };

  const sendComposerMessage = async (payload: {
    recipients: Applicant[];
    channel: "email" | "sms";
    subject: string;
    body: string;
  }) => {
    const recipientsToSend = payload.recipients
      .map((recipient) => ({
        applicationId: recipient.applicationId,
        to: payload.channel === "email" ? recipient.email : recipient.phone,
      }))
      .filter((recipient) => recipient.to.trim().length > 0);

    if (!recipientsToSend.length) {
      pushToast(
        "error",
        payload.channel === "email"
          ? "Selected recipients do not have email addresses."
          : "Selected recipients do not have phone numbers.",
      );
      return;
    }

    setComposerBusy(true);
    try {
      await Promise.all(
        recipientsToSend.map(async (recipient) => {
          const created = await createApplicationMessage(recipient.applicationId, {
            channel: payload.channel,
            to_value: recipient.to.trim(),
            subject: payload.channel === "email" ? payload.subject.trim() : undefined,
            body: payload.body.trim(),
          });
          await sendApplicationMessage(recipient.applicationId, created.id);
        }),
      );
      setComposerOpen(false);
      setMessageTarget(null);
      pushToast(
        "success",
        `Message sent to ${recipientsToSend.length} recipient${recipientsToSend.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      pushToast("error", error instanceof ApiError ? error.message : "Failed to send message.");
    } finally {
      setComposerBusy(false);
    }
  };

  const openMessageComposer = (target: Applicant | null = null) => {
    setMessageTarget(target);
    setComposerOpen(true);
  };

  const saveReviewMessageForDetails = async (applicant: Applicant, message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    const targetStatus = normalizeStatus(
      detailsPipeline?.application?.status ||
      detailsPipeline?.application?.stage ||
      applicant.status,
    );

    setSavingReviewMessage(true);
    try {
      const updated = await api<ApiApplicationRow>(`/applications/${applicant.applicationId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus, message: trimmedMessage }),
      });
      const nextStatus = normalizeStatus(updated.status ?? updated.stage ?? targetStatus);
      const nextReviewMessage = String(updated.review_message ?? trimmedMessage).trim();

      setApplicants((current) =>
        current.map((entry) =>
          entry.id === applicant.id
            ? {
              ...entry,
              status: nextStatus,
              reviewMessage: nextReviewMessage || null,
              reviewedAt: updated.reviewed_at ?? entry.reviewedAt,
              reviewedBy: updated.reviewed_by ?? entry.reviewedBy,
            }
            : entry,
        ),
      );

      setDetailsPipeline((current) => {
        if (!current) return current;
        return {
          ...current,
          application: {
            ...current.application,
            ...updated,
            status: updated.status ?? current.application.status,
            stage: updated.stage ?? current.application.stage,
            review_message: nextReviewMessage || current.application.review_message,
          },
        };
      });
      setDetailsReviewMessageDraft(nextReviewMessage);

      pushToast("success", `Review message saved for ${applicant.name}.`);
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to save review message.");
    } finally {
      setSavingReviewMessage(false);
    }
  };

  const openDetails = async (applicant: Applicant) => {
    setDetailsOpen(true);
    setDetailsTarget(applicant);
    setDetailsPipeline(null);
    setSavingReviewMessage(false);
    setDetailsActionBusy(false);
    setDetailsReviewMessageDraft(String(applicant.reviewMessage || "").trim());
    setDetailsLoading(true);
    try {
      const data = await api<ApplicationPipelineResponse>(`/applications/${applicant.applicationId}/pipeline`);
      setDetailsPipeline(data);
      setDetailsReviewMessageDraft(
        String(data.application?.review_message || applicant.reviewMessage || "").trim(),
      );
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to load details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const resendAcceptanceForApplicant = async (applicant: Applicant) => {
    setDetailsActionBusy(true);
    try {
      await resendAcceptanceMessage(applicant.applicationId);
      pushToast("success", `Acceptance message resent for ${applicant.name}.`);
      if (detailsOpen && detailsTarget?.id === applicant.id) {
        await openDetails(applicant);
      }
    } catch (error) {
      pushToast("error", error instanceof ApiError ? error.message : "Failed to resend acceptance message.");
    } finally {
      setDetailsActionBusy(false);
    }
  };

  const reopenApplication = async (applicant: Applicant) => {
    setDetailsActionBusy(true);
    try {
      const updated = await api<ApiApplicationRow>(`/applications/${applicant.applicationId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ status: "reviewing" }),
      });
      const nextStatus = normalizeStatus(updated.status ?? updated.stage ?? "reviewing");
      setApplicants((current) =>
        current.map((entry) =>
          entry.id === applicant.id
            ? {
                ...entry,
                status: nextStatus,
                reviewMessage: updated.review_message ?? entry.reviewMessage,
                reviewedAt: updated.reviewed_at ?? entry.reviewedAt,
                reviewedBy: updated.reviewed_by ?? entry.reviewedBy,
              }
            : entry,
        ),
      );
      setDetailsPipeline((current) => {
        if (!current) return current;
        return {
          ...current,
          application: {
            ...current.application,
            ...updated,
            status: updated.status ?? current.application.status,
            stage: updated.stage ?? current.application.stage,
          },
        };
      });
      pushToast("success", `Application reopened for ${applicant.name}.`);
    } catch (error) {
      pushToast("error", error instanceof ApiError ? error.message : "Failed to reopen application.");
    } finally {
      setDetailsActionBusy(false);
    }
  };

  const funnelMetrics = useMemo(() => {
    const counts = STATUSES.reduce<Record<ApplicationStatus, number>>(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {} as Record<ApplicationStatus, number>,
    );

    applicants.forEach((applicant) => {
      counts[applicant.status] += 1;
    });

    const total = applicants.length;
    const rows = STATUSES.map((stage) => ({
      stage,
      label: workflowStatusLabel(stage),
      count: counts[stage],
      percent: 0,
    }));

    if (total === 0) return rows;

    const withRaw = rows.map((row) => {
      const raw = (row.count / total) * 100;
      return {
        ...row,
        raw,
        percent: Math.floor(raw),
      };
    });

    let remaining = 100 - withRaw.reduce((sum, row) => sum + row.percent, 0);
    withRaw
      .map((row, index) => ({
        index,
        fraction: row.raw - Math.floor(row.raw),
      }))
      .sort((a, b) => b.fraction - a.fraction)
      .slice(0, Math.max(0, remaining))
      .forEach(({ index }) => {
        withRaw[index].percent += 1;
        remaining -= 1;
      });

    return withRaw.map((row) => ({
      stage: row.stage,
      label: row.label,
      count: row.count,
      percent: row.percent,
    }));
  }, [applicants]);

  return (
    <PageShell>
      <div className="admx-root">
        <section className="admx-funnel-card">
          <div className="admx-funnel-card__head">
            <p className="admx-funnel-card__title">Admissions Funnel</p>
            <p className="admx-funnel-card__program">{cohortName}</p>
          </div>
          <div className="admx-funnel-card__body">
            <div className="admx-funnel-metrics">
              {funnelMetrics.map((metric, index) => (
                <div key={metric.stage} className="admx-funnel-metric">
                  <p className="admx-funnel-metric__value">{metric.count}</p>
                  <p className="admx-funnel-metric__label">{metric.label}</p>
                  <p className="admx-funnel-metric__conversion">{metric.percent}%</p>
                  {index < funnelMetrics.length - 1 ? <span className="admx-funnel-metric__arrow">→</span> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="admx-topbar">
          <div className="admx-topbar__left" ref={dropdownRef}>
            <button className="admx-program-btn" type="button" onClick={() => setCohortDropdownOpen((v) => !v)}>
              {loadingCohorts ? <PulseDots layout="inline" label="Loading cohorts" /> : cohortName} <span>▾</span>
            </button>
            {cohortDropdownOpen ? (
              <div className="admx-program-menu">
                {cohorts.map((cohort) => (
                  <button key={cohort.id} className={selectedCohortId === String(cohort.id) ? "admx-program-menu__item admx-program-menu__item--active" : "admx-program-menu__item"} type="button" onClick={() => { setSelectedCohortId(String(cohort.id)); setCohortDropdownOpen(false); setActiveTab("All"); setSelectedIds(new Set()); setCurrentPage(1); }}>
                    {cohort.name}
                  </button>
                ))}
              </div>
            ) : null}
            <h2 className="admx-topbar__title">Applications</h2>
          </div>
        </section>

        <div className="popapply-stage-filters popapply-stage-filters--tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={tab.id === activeTab ? "popapply-stage-chip popapply-stage-chip--active" : "popapply-stage-chip"}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
            >
              <span className="popapply-stage-chip__label">{tab.id === "All" ? "All" : workflowStatusLabel(tab.id, { confirmedLabel: "Confirmed" })}</span>
              <span className="popapply-stage-chip__count">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="popapply-filters popapply-filters--top">
          <div className="popapply-search-wrap">
            <input className="popapply-search" type="text" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }} placeholder="Search name, email..." />
          </div>
          <div className="admx-header-actions">
            <button
              className={
                showRescheduleOnly
                  ? "popapply-btn popapply-btn--primary popapply-filter-toggle"
                  : "popapply-btn popapply-btn--outline popapply-filter-toggle"
              }
              type="button"
              onClick={() => {
                setShowRescheduleOnly((current) => !current);
                setCurrentPage(1);
              }}
              disabled={!showRescheduleOnly && rescheduleRequestedCount === 0}
            >
              Reschedule Requests ({rescheduleRequestedCount})
            </button>
            <button
              className="popapply-btn popapply-btn--outline popapply-filter-toggle"
              type="button"
              onClick={() => setCsvExportOpen(true)}
              disabled={filtered.length === 0}
            >
              Export CSV
            </button>
            <button
              className={filterPanelOpen ? "popapply-btn popapply-btn--primary popapply-filter-toggle" : "popapply-btn popapply-btn--outline popapply-filter-toggle"}
              type="button"
              onClick={() => setFilterPanelOpen((current) => !current)}
            >
              <FilterIcon />
              More Filters
            </button>
          </div>
        </div>

        {filterPanelOpen ? (
          <div className="popapply-filter-panel">
            <div className="popapply-filter-grid">
              <div className="popapply-control">
                <label className="popapply-label">Sort By</label>
                <select className="popapply-input" value={filters.sortField} onChange={(event) => setFilters((current) => ({ ...current, sortField: event.target.value as SortField }))}>
                  <option value="appliedDate">Applied Date</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                </select>
              </div>
              <div className="popapply-control">
                <label className="popapply-label">Order</label>
                <select className="popapply-input" value={filters.sortDirection} onChange={(event) => setFilters((current) => ({ ...current, sortDirection: event.target.value as SortDirection }))}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {someSelected ? (
          <section className="admx-bulkbar">
            <div className="admx-bulkbar__left">
              <p>{selectedIds.size} applicant{selectedIds.size === 1 ? "" : "s"} selected</p>
              <button className="admx-bulkbar__clear" type="button" aria-label="Clear selected applicants" onClick={() => setSelectedIds(new Set())}>×</button>
            </div>
            <div className="admx-bulkbar__actions">
              <div className="admx-bulkbar__select-wrap">
                <select className="admx-bulkbar__select" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as ApplicationStatus | "")} disabled={bulkApplying}>
                  <option value="">Change status...</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{workflowStatusLabel(status, { confirmedLabel: "Confirmed" })}</option>
                  ))}
                </select>
              </div>
              <button className="admx-bulkbar__apply" type="button" onClick={() => void applyBulkStageChange()} disabled={!bulkStatus || bulkApplying}>
                {bulkApplying ? "Applying..." : "Apply"}
              </button>
              <button
                className="btn btn--secondary btn--sm admx-create-user-btn"
                type="button"
                onClick={() => {
                  openCreateUserModal(
                    selectedApplicants,
                    `${selectedApplicants.length} selected applicant${selectedApplicants.length === 1 ? "" : "s"}`,
                  );
                }}
                disabled={bulkApplying || bulkCreatingUsers || selectedCreateEligibleCount === 0}
              >
                {selectedCreateEligibleCount === 0
                  ? selectedApplicants.length === 1
                    ? "User Created"
                    : "Users Created"
                  : bulkCreatingUsers
                    ? "Creating..."
                    : "Create User"}
              </button>
              <button className="admx-bulkbar__message" type="button" onClick={() => openMessageComposer()} disabled={bulkApplying}>
                <MessageIcon />
                Message
              </button>
            </div>
          </section>
        ) : null}

        <section className="admx-table-wrap">
          {loadingApplications ? (
            <div className="admx-empty"><PulseDots padding={40} label="Loading applications" /></div>
          ) : filtered.length > 0 ? (
            <>
              <div className="admx-table-scroll">
                <table className="admx-table">
                  <thead>
                    <tr>
                      <th><button className={allVisibleSelected ? "admx-check admx-check--active" : "admx-check"} type="button" onClick={() => {
                        if (allVisibleSelected) {
                          setSelectedIds((current) => { const next = new Set(current); paginated.forEach((a) => next.delete(a.id)); return next; });
                        } else {
                          setSelectedIds((current) => { const next = new Set(current); paginated.forEach((a) => next.add(a.id)); return next; });
                        }
                      }}>{allVisibleSelected ? "✓" : ""}</button></th>
                      <th>Applicant</th>
                      <th>Applied</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((a) => (
                      <ApplicantRow
                        key={a.id}
                        applicant={a}
                        isSelected={selectedIds.has(a.id)}
                        isUpdating={updatingIds.has(a.applicationId)}
                        isCreatingUser={creatingUserIds.has(a.applicationId)}
                        isUserCreated={applicantHasUser(a, existingUserEmails)}
                        onSelect={(id) =>
                          setSelectedIds((current) => {
                            const next = new Set(current);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          })
                        }
                        onStatusChange={(id, status) => void onStatusChange(id, status)}
                        onCreateUser={(target) => {
                          openCreateUserModal([target], target.name);
                        }}
                        onOpenDetails={(target) => void openDetails(target)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admx-pagination">
                <p>Showing <strong>{pageStart}-{pageEnd}</strong> of <strong>{filtered.length}</strong> applicants</p>
                <div className="admx-pagination__controls">
                  <button className="btn btn--secondary btn--sm admx-page-nav" type="button" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Previous</button>
                  <div className="admx-pages">
                    {buildPageItems(totalPages, safePage).map((page, index) => page === "ellipsis" ? <span key={`e-${index}`} className="admx-pages__ellipsis">...</span> : <button key={page} className={safePage === page ? "admx-page-btn admx-page-btn--active" : "admx-page-btn"} type="button" onClick={() => setCurrentPage(page)}>{page}</button>)}
                  </div>
                  <button className="btn btn--secondary btn--sm admx-page-nav" type="button" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                </div>
              </div>
            </>
          ) : (
            <div className="admx-empty"><h3>No applicants found</h3><p>Try adjusting filters.</p></div>
          )}
        </section>

        <DetailsModal
          open={detailsOpen}
          applicant={detailsTarget}
          pipeline={detailsPipeline}
          loading={detailsLoading}
          savingReviewMessage={savingReviewMessage}
          actionBusy={detailsActionBusy}
          reviewMessageDraft={detailsReviewMessageDraft}
          onMessageApplicant={(target) => {
            setDetailsOpen(false);
            setDetailsPipeline(null);
            setSavingReviewMessage(false);
            setDetailsActionBusy(false);
            setDetailsReviewMessageDraft("");
            openMessageComposer(target);
          }}
          onReviewMessageDraftChange={setDetailsReviewMessageDraft}
          onSaveReviewMessage={(target, message) => {
            void saveReviewMessageForDetails(target, message);
          }}
          onReopenApplication={(target) => {
            void reopenApplication(target);
          }}
          onResendAcceptance={(target) => {
            void resendAcceptanceForApplicant(target);
          }}
          onClose={() => {
            setDetailsOpen(false);
            setDetailsTarget(null);
            setDetailsPipeline(null);
            setSavingReviewMessage(false);
            setDetailsActionBusy(false);
            setDetailsReviewMessageDraft("");
          }}
        />
        <CreateUserDeliveryModal
          key={`${createUserTargets.map((entry) => entry.applicationId).join(",")}:${String(createUserInitialChannels.email)}:${String(createUserInitialChannels.sms)}`}
          open={createUserModalOpen}
          label={createUserLabel}
          recipients={createUserTargets}
          initialChannels={createUserInitialChannels}
          busy={createUserModalBusy}
          onClose={closeCreateUserModal}
          onSubmit={(channels) => {
            void submitCreateUserModal(channels);
          }}
          onInvalidSubmit={() => {
            pushToast("error", "Select at least one delivery channel.");
          }}
        />
        {schedulerOpen ? (
          <InterviewSchedulerModal
            applicant={schedulerTarget}
            busy={schedulerBusy}
            initial={schedulerInitial}
            onClose={() => closeScheduler()}
            onSubmit={(input) => void submitScheduler(input)}
          />
        ) : null}
        <ConfirmActionModal
          open={Boolean(confirmState)}
          title={confirmState?.title || ""}
          message={confirmState?.message || ""}
          confirmLabel="Continue"
          cancelLabel="Cancel"
          onConfirm={() => closeConfirmation(true)}
          onClose={() => closeConfirmation(false)}
        />
        {composerOpen ? (
          <MessageComposer
            onClose={() => {
              setComposerBusy(false);
              setComposerOpen(false);
              setMessageTarget(null);
            }}
            preselected={messageTarget}
            applicants={applicants}
            selectedIds={[...selectedIds]}
            templates={messageTemplates}
            busy={composerBusy}
            onSend={(payload) => void sendComposerMessage(payload)}
          />
        ) : null}
        {csvExportOpen ? (
          <CsvExportModal<Applicant>
            onClose={() => setCsvExportOpen(false)}
            title="Export Admissions CSV"
            filename={`admissions-${selectedCohortId || "cohort"}-${new Date().toISOString().slice(0, 10)}`}
            columns={csvColumns}
            rowScopes={csvRowScopes}
          />
        ) : null}
        <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      </div>
    </PageShell>
  );
}
