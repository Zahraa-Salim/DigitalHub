// File: frontend/src/dashboard/pages/admin/GeneralApplyPage.tsx
// Purpose: Renders the admin general apply page page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConfirmActionModal } from "../../components/ConfirmActionModal";
import { CsvExportModal, type CsvExportColumn } from "../../components/CsvExportModal";
import {
  type MessageTemplate,
  type ProgramApplicationListItem,
  type ProgramApplicationStage,
  createProgramApplicationMessage,
  createUserFromProgramApplication,
  getProgramApplicationDetail,
  listMessageTemplates,
  listProgramApplications,
  markProgramApplicationInterviewCompleted,
  scheduleProgramApplicationInterview,
  sendProgramApplicationMessage,
  updateProgramApplicationStage,
} from "../../lib/api";
import { useGlobalMessagingContext } from "../../components/GlobalMessagingContext";
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
import { ApiError, apiList } from "../../utils/api";
import "../../styles/general-apply.css";

type ApplicationFilter = "all" | ProgramApplicationStage;
type RecipientGroup = "individual" | "all" | "selected" | ProgramApplicationStage;
type InterviewLocationType = "online" | "in_person" | "phone";
type ConfirmState = {
  title: string;
  message: string;
};

type ProgramOption = { id: number; title: string };
type ComposerRecipient = {
  id: number;
  name: string;
  email: string;
  phone: string;
  stage: ProgramApplicationStage;
  programTitle: string;
};
type DetailData = {
  program_application: Record<string, unknown>;
  applicant: Record<string, unknown> | null;
  program: Record<string, unknown>;
};

type CreateUserDeliveryChannels = {
  email: boolean;
  sms: boolean;
};

type StatusCountMap = Record<ProgramApplicationStage, number>;

const STATUS_ORDER: ProgramApplicationStage[] = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "rejected",
  "participation_confirmed",
];

const EMPTY_STATUS_COUNTS: StatusCountMap = {
  applied: 0,
  reviewing: 0,
  invited_to_interview: 0,
  interview_confirmed: 0,
  accepted: 0,
  rejected: 0,
  participation_confirmed: 0,
};

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 5h18l-7 8v5l-4 2v-7z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4.5 3v-3H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function toStage(value: string): ProgramApplicationStage {
  return STATUS_ORDER.includes(value as ProgramApplicationStage) ? (value as ProgramApplicationStage) : "applied";
}

function hasCreatedUser(value: unknown): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function statusClass(status: ProgramApplicationStage): string {
  switch (status) {
    case "reviewing":
      return "popapply-status--reviewing";
    case "invited_to_interview":
      return "popapply-status--invited";
    case "interview_confirmed":
      return "popapply-status--interview";
    case "accepted":
      return "popapply-status--accepted";
    case "rejected":
      return "popapply-status--rejected";
    case "participation_confirmed":
      return "popapply-status--confirmed";
    case "applied":
    default:
      return "popapply-status--applied";
  }
}

function isProgramApplicationStage(value: string): value is ProgramApplicationStage {
  return STATUS_ORDER.includes(value as ProgramApplicationStage);
}

function overviewGeneralApplyFocusMessage(focus: string): string {
  switch (focus) {
    case "applied":
      return "Overview shortcut: showing newly applied general applications.";
    case "reviewing":
      return "Overview shortcut: showing reviewing general applications.";
    case "invited_to_interview":
      return "Overview shortcut: showing invited-to-interview general applications.";
    case "interview_confirmed":
      return "Overview shortcut: showing interview-confirmed general applications.";
    case "accepted":
      return "Overview shortcut: showing accepted general applications.";
    case "rejected":
      return "Overview shortcut: showing rejected general applications.";
    case "participation_confirmed":
      return "Overview shortcut: showing participation-confirmed general applications.";
    case "messaging":
      return "Overview shortcut: general apply messaging workflow ready.";
    case "create_user":
      return "Overview shortcut: showing participation-confirmed applicants for user creation.";
    default:
      return "Overview shortcut applied to General Apply.";
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toIsoDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toISOString();
}

function toSubmittedLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasDeliverableEmail(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && !trimmed.endsWith("@digitalhub.local");
}

function toSubmittedValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => toSubmittedValue(item)).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

function getSubmissionEntries(
  submissionAnswers: unknown,
  options?: { programTitle?: string; programTitleById?: Map<number, string> },
): Array<{ key: string; label: string; value: string }> {
  if (!submissionAnswers || typeof submissionAnswers !== "object" || Array.isArray(submissionAnswers)) {
    return [];
  }

  return Object.entries(submissionAnswers as Record<string, unknown>).map((entry) => {
    const [key, value] = entry;
    if (!hasSubmittedValue(value)) {
      return null;
    }

    const normalizedKey = key.trim().toLowerCase();
    const compactKey = normalizedKey.replace(/[^a-z0-9]+/g, "");
    if (compactKey === "programid" || compactKey === "program") {
      const numericProgramId =
        typeof value === "number"
          ? value
          : Number(String(value).trim());
      const mappedProgramTitle =
        options?.programTitle ||
        (Number.isFinite(numericProgramId) ? options?.programTitleById?.get(numericProgramId) : undefined);

      if (mappedProgramTitle) {
        return {
          key,
          label: "Program",
          value: mappedProgramTitle,
        };
      }
      const fallbackProgramValue = typeof value === "string" ? value.trim() : "";
      if (fallbackProgramValue) {
        return {
          key,
          label: "Program",
          value: fallbackProgramValue,
        };
      }
      return null;
    }

    return {
      key,
      label: toSubmittedLabel(key),
      value: toSubmittedValue(value),
    };
  }).filter((entry): entry is { key: string; label: string; value: string } => Boolean(entry));
}

type InterviewSchedulerModalProps = {
  applicantName: string;
  busy: boolean;
  error: string;
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

function InterviewSchedulerModal({
  applicantName,
  busy,
  error,
  initial,
  onClose,
  onSubmit,
}: InterviewSchedulerModalProps) {
  const [scheduledAt, setScheduledAt] = useState(initial.scheduled_at);
  const [durationMinutes, setDurationMinutes] = useState(initial.duration_minutes);
  const [locationType, setLocationType] = useState<InterviewLocationType>(initial.location_type);
  const [locationDetails, setLocationDetails] = useState(initial.location_details);

  return (
    <div className="admx-modal" role="presentation">
      <div className="admx-modal__backdrop" onClick={onClose} />
      <div className="admx-modal__card" role="dialog" aria-modal="true">
        <header className="admx-modal__header">
          <div>
            <h3>Schedule Interview</h3>
            <p>{applicantName}</p>
          </div>
        </header>
        <div className="admx-modal__body">
          {error ? <p className="admx-inline-error">{error}</p> : null}
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
            onClick={() =>
              onSubmit({
                scheduled_at: scheduledAt,
                duration_minutes: durationMinutes,
                location_type: locationType,
                location_details: locationDetails.trim(),
              })
            }
          >
            {busy ? "Scheduling interview..." : "Schedule Interview"}
          </button>
        </footer>
      </div>
    </div>
  );
}

type CreateUserDeliveryModalProps = {
  open: boolean;
  label: string;
  recipients: ComposerRecipient[];
  initialChannels: CreateUserDeliveryChannels;
  busy: boolean;
  onClose: () => void;
  onSubmit: (channels: CreateUserDeliveryChannels) => void;
};

function CreateUserDeliveryModal({
  open,
  label,
  recipients,
  initialChannels,
  busy,
  onClose,
  onSubmit,
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
          {!canSubmit ? (
            <p className="admx-inline-error">Select at least one delivery channel.</p>
          ) : null}
        </div>
        <footer className="admx-modal__footer">
          <button className="btn btn--secondary btn--sm" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn--primary btn--sm"
            type="button"
            disabled={!canSubmit || busy}
            onClick={() => onSubmit({ email: emailEnabled, sms: smsEnabled })}
          >
            {busy ? "Creating..." : "Create User"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function GeneralApplyPage() {
  const { setPageData: setGlobalMessagingPageData } = useGlobalMessagingContext();
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<ApplicationFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const [programFilter, setProgramFilter] = useState<number | "all">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "stage">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [applicants, setApplicants] = useState<ProgramApplicationListItem[]>([]);
  const [allStatusCount, setAllStatusCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCountMap>(EMPTY_STATUS_COUNTS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ProgramApplicationStage | "">("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [applicationsError, setApplicationsError] = useState("");

  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingReviewMessage, setSavingReviewMessage] = useState(false);
  const [detailReviewMessageDraft, setDetailReviewMessageDraft] = useState("");
  const [detailError, setDetailError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTargetId, setScheduleTargetId] = useState<number | null>(null);
  const [scheduleTargetName, setScheduleTargetName] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [scheduleInitial, setScheduleInitial] = useState({
    scheduled_at: "",
    duration_minutes: 30,
    location_type: "online" as InterviewLocationType,
    location_details: "",
  });
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [createUserTargetIds, setCreateUserTargetIds] = useState<number[]>([]);
  const [createUserLabel, setCreateUserLabel] = useState("");
  const [createUserInitialChannels, setCreateUserInitialChannels] = useState<CreateUserDeliveryChannels>({
    email: true,
    sms: true,
  });

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPreselectedId, setComposerPreselectedId] = useState<number | null>(null);
  const [composerGroup, setComposerGroup] = useState<RecipientGroup>("all");
  const [composerSingleId, setComposerSingleId] = useState<number | null>(null);
  const [composerChannel, setComposerChannel] = useState<"email" | "sms">("email");
  const [composerSubject, setComposerSubject] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerShowTemplates, setComposerShowTemplates] = useState(false);
  const [composerBusy, setComposerBusy] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(FALLBACK_MESSAGE_TEMPLATES);
  const [confirmResolver, setConfirmResolver] = useState<((confirmed: boolean) => void) | null>(null);

  const [programs, setPrograms] = useState<ProgramOption[]>([]);

  const requestConfirmation = (title: string, message: string) =>
    new Promise<boolean>((resolve) => {
      setConfirmResolver(() => resolve);
      setConfirmState({ title, message });
    });

  const closeConfirmation = (confirmed: boolean) => {
    setConfirmState(null);
    confirmResolver?.(confirmed);
    setConfirmResolver(null);
  };

  useEffect(() => {
    const sourceParam = String(searchParams.get("source") || "").trim().toLowerCase();
    const stageParam = String(searchParams.get("stage") || "").trim().toLowerCase();
    const programIdParam = String(searchParams.get("program_id") || "").trim();
    const searchParam = searchParams.get("search");
    const sortByParam = String(searchParams.get("sortBy") || "").trim().toLowerCase();
    const orderParam = String(searchParams.get("order") || "").trim().toLowerCase();
    const focusParam = String(searchParams.get("focus") || "").trim().toLowerCase();

    if (stageParam === "all") {
      setActiveFilter("all");
    } else if (stageParam && isProgramApplicationStage(stageParam)) {
      setActiveFilter(stageParam);
    }

    if (programIdParam) {
      const parsedProgramId = Number(programIdParam);
      if (Number.isFinite(parsedProgramId) && parsedProgramId > 0) {
        setProgramFilter(parsedProgramId);
      }
    }

    if (typeof searchParam === "string") {
      setSearchQuery(searchParam);
    }

    if (sortByParam === "created_at" || sortByParam === "updated_at" || sortByParam === "stage") {
      setSortBy(sortByParam);
    }
    if (orderParam === "asc" || orderParam === "desc") {
      setSortOrder(orderParam);
    }

    if (sourceParam === "overview") {
      setActionSuccess(overviewGeneralApplyFocusMessage(focusParam || stageParam));
      setActionError("");
      setApplicationsError("");
      setSelectedIds(new Set());
      setPage(1);
      setFilterPanelOpen(false);
    }
  }, [searchParams]);

  const selectedApplication = useMemo(() => applicants.find((item) => item.id === selectedApplicationId) ?? null, [applicants, selectedApplicationId]);
  const programTitleById = useMemo(
    () => new Map(programs.map((program) => [program.id, program.title])),
    [programs],
  );
  const resolvedProgramTitle = useMemo(
    () =>
      String(
        detailData?.program?.title ??
          selectedApplication?.program_title ??
          "",
      ).trim() || undefined,
    [detailData?.program?.title, selectedApplication?.program_title],
  );
  const submissionEntries = useMemo(
    () =>
      getSubmissionEntries(detailData?.program_application?.submission_answers, {
        programTitle: resolvedProgramTitle,
        programTitleById,
      }),
    [detailData, programTitleById, resolvedProgramTitle],
  );
  const currentReviewMessage = useMemo(
    () => String(detailData?.program_application?.review_message ?? "").trim(),
    [detailData?.program_application?.review_message],
  );
  const canSaveReviewMessage =
    Boolean(selectedApplicationId) &&
    !loadingDetail &&
    !savingReviewMessage &&
    detailReviewMessageDraft.trim().length > 0 &&
    detailReviewMessageDraft.trim() !== currentReviewMessage;
  const composerApplicants = useMemo<ComposerRecipient[]>(
    () =>
      applicants.map((item) => ({
        id: item.id,
        name: item.full_name?.trim() || item.email?.trim() || "Unnamed applicant",
        email: item.email?.trim() || "",
        phone: item.phone?.trim() || "",
        stage: toStage(item.stage),
        programTitle: item.program_title,
      })),
    [applicants],
  );
  const createUserTargetIdSet = useMemo(() => new Set(createUserTargetIds), [createUserTargetIds]);
  const createUserRecipients = useMemo(
    () => composerApplicants.filter((entry) => createUserTargetIdSet.has(entry.id)),
    [composerApplicants, createUserTargetIdSet],
  );
  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);
  const selectedApplicants = useMemo(
    () => applicants.filter((item) => selectedIds.has(item.id)),
    [applicants, selectedIds],
  );
  const selectedCreateEligibleCount = useMemo(
    () => selectedApplicants.filter((item) => !hasCreatedUser(item.created_user_id)).length,
    [selectedApplicants],
  );
  const selectedExportRows = useMemo(
    () => applicants.filter((row) => selectedIds.has(row.id)),
    [applicants, selectedIds],
  );
  const csvColumns = useMemo<CsvExportColumn<ProgramApplicationListItem>[]>(
    () => [
      { key: "applicant", label: "Applicant", getValue: (row) => row.full_name || row.email || "Unnamed applicant" },
      { key: "email", label: "Email", getValue: (row) => row.email || "" },
      { key: "phone", label: "Phone", getValue: (row) => row.phone || "" },
      { key: "program", label: "Program", getValue: (row) => row.program_title },
      { key: "applied", label: "Applied", getValue: (row) => formatDate(row.created_at) },
      { key: "status", label: "Status", getValue: (row) => workflowStatusLabel(toStage(row.stage), { confirmedLabel: "Confirmed" }) },
    ],
    [],
  );
  const csvRowScopes = useMemo(
    () => [
      { id: "visible", label: "Visible Page", rows: applicants, default: true },
      { id: "selected", label: "Selected", rows: selectedExportRows },
    ],
    [applicants, selectedExportRows],
  );
  const composerRecipients = useMemo(() => {
    if (composerGroup === "individual") {
      return composerApplicants.filter((entry) => entry.id === composerSingleId);
    }
    if (composerGroup === "selected") {
      return composerApplicants.filter((entry) => selectedIds.has(entry.id));
    }
    if (composerGroup === "all") return composerApplicants;
    return composerApplicants.filter((entry) => entry.stage === composerGroup);
  }, [composerApplicants, composerGroup, composerSingleId, selectedIds]);
  const composerCanSend =
    composerRecipients.length > 0 &&
    composerBody.trim().length > 0 &&
    (composerChannel === "sms" || composerSubject.trim().length > 0);
  const visibleMessageTemplates = useMemo(
    () => filterTemplatesForChannel(messageTemplates, composerChannel),
    [messageTemplates, composerChannel],
  );
  const visibleIds = applicants.map((item) => item.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  useEffect(() => {
    setGlobalMessagingPageData({
      scope: "program_applications",
      recipients: applicants.map((entry) => ({
        id: String(entry.id),
        name: entry.full_name?.trim() || entry.email?.trim() || "Unnamed applicant",
        email: entry.email?.trim() || "",
        phone: entry.phone?.trim() || "",
        status: toStage(entry.stage),
        meta: entry.program_title,
      })),
      selectedRecipientIds: [...selectedIds].map((value) => String(value)),
      statusOptions: [...STATUS_ORDER],
    });

    return () => setGlobalMessagingPageData(null);
  }, [applicants, selectedIds, setGlobalMessagingPageData]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setBulkStatus("");
    }
  }, [selectedIds.size]);

  const loadApplications = async () => {
    setLoadingApplications(true);
    setApplicationsError("");
    try {
      const search = searchQuery.trim() || undefined;
      const result = await listProgramApplications({
        page,
        limit: 10,
        sortBy,
        order: sortOrder,
        stage: activeFilter === "all" ? undefined : activeFilter,
        search,
        program_id: programFilter === "all" ? undefined : programFilter,
      });
      setApplicants(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      setApplicationsError(error instanceof ApiError ? error.message : "Failed to load program applications.");
      setApplicants([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoadingApplications(false);
    }
  };

  const loadStatusCounts = async () => {
    try {
      const search = searchQuery.trim() || undefined;
      const baseParams = {
        page: 1,
        limit: 1,
        search,
        program_id: programFilter === "all" ? undefined : programFilter,
      };

      const [allResult, ...statusResults] = await Promise.all([
        listProgramApplications(baseParams),
        ...STATUS_ORDER.map((stage) => listProgramApplications({ ...baseParams, stage })),
      ]);

      const nextCounts: StatusCountMap = { ...EMPTY_STATUS_COUNTS };
      STATUS_ORDER.forEach((stage, index) => {
        nextCounts[stage] = statusResults[index]?.pagination?.total ?? 0;
      });
      setAllStatusCount(allResult.pagination.total);
      setStatusCounts(nextCounts);
    } catch {
      setAllStatusCount(0);
      setStatusCounts(EMPTY_STATUS_COUNTS);
    }
  };

  const loadDetail = async (id: number) => {
    setLoadingDetail(true);
    setDetailError("");
    try {
      const detail = await getProgramApplicationDetail(id);
      setDetailData({
        program_application: detail.program_application,
        applicant: detail.applicant,
        program: detail.program,
      });
      setDetailReviewMessageDraft(String(detail.program_application?.review_message ?? "").trim());
    } catch (error) {
      setDetailError(error instanceof ApiError ? error.message : "Failed to load application detail.");
      setDetailData(null);
      setDetailReviewMessageDraft("");
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, sortOrder, activeFilter, programFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      void loadApplications();
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStatusCounts();
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, programFilter]);

  useEffect(() => {
    let active = true;
    const loadPrograms = async () => {
      try {
        const result = await apiList<ProgramOption>("/programs?limit=100&sortBy=title&order=asc");
        if (!active) return;
        setPrograms(result.data);
      } catch {
        if (!active) return;
        setPrograms([]);
      }
    };
    void loadPrograms();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadTemplates = async () => {
      try {
        const result = await listMessageTemplates({ limit: 100, sortBy: "sort_order", order: "asc" });
        if (!active) return;
        const templates = result.data;
        setMessageTemplates(templates.length ? templates : FALLBACK_MESSAGE_TEMPLATES);
      } catch {
        if (!active) return;
        setMessageTemplates(FALLBACK_MESSAGE_TEMPLATES);
      }
    };
    void loadTemplates();
    return () => {
      active = false;
    };
  }, []);

  const runAction = async (work: () => Promise<unknown>) => {
    setActionBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await work();
      await loadApplications();
      await loadStatusCounts();
      if (selectedApplicationId) {
        await loadDetail(selectedApplicationId);
      }
      return true;
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Action couldn't be completed. Please try again.");
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const openCreateUserModal = (ids: number[], label: string) => {
    if (!ids.length) return;
    const idSet = new Set(ids);
    const eligibleIds = applicants
      .filter((entry) => idSet.has(entry.id) && !hasCreatedUser(entry.created_user_id))
      .map((entry) => entry.id);
    if (!eligibleIds.length) {
      setActionError("Selected applicant(s) already have user accounts.");
      return;
    }
    const eligibleIdSet = new Set(eligibleIds);
    const targets = composerApplicants.filter((entry) => eligibleIdSet.has(entry.id));
    const emailAvailable = targets.some((entry) => hasDeliverableEmail(entry.email));
    const phoneAvailable = targets.some((entry) => entry.phone.trim().length > 0);
    setCreateUserTargetIds(eligibleIds);
    setCreateUserLabel(label);
    setCreateUserInitialChannels({
      email: emailAvailable || !phoneAvailable,
      sms: phoneAvailable,
    });
    setCreateUserModalOpen(true);
  };

  const closeCreateUserModal = () => {
    if (actionBusy) return;
    setCreateUserModalOpen(false);
    setCreateUserTargetIds([]);
    setCreateUserLabel("");
  };

  const createSingleUser = async (
    id: number,
    label?: string | null,
    channels?: CreateUserDeliveryChannels,
  ) => {
    await runAction(async () => {
      const safeLabel = label?.trim() || "this applicant";
      let response;
      try {
        response = await createUserFromProgramApplication(id, {
          channels: {
            email: channels?.email,
            sms: channels?.sms,
            whatsapp: channels?.sms,
          },
        });
      } catch (error) {
        throw new Error(toFriendlyCreateUserError(error, safeLabel, "PROGRAM_APPLICATION_NOT_FOUND"));
      }
      const createdUserId = Number((response as { user_id?: unknown }).user_id);
      if (Number.isFinite(createdUserId) && createdUserId > 0) {
        setApplicants((current) =>
          current.map((entry) => (entry.id === id ? { ...entry, created_user_id: createdUserId } : entry)),
        );
      }
      const existingUser = Boolean((response as { existing_user?: unknown }).existing_user);
      const summary = summarizeOnboardingMessage(response);
      const extras: string[] = [];
      if (summary.sentCount > 0) extras.push(`credentials sent (${summary.sentCount})`);
      if (summary.skipped) extras.push(onboardingSkipReasonText(summary.reason));
      setActionSuccess(
        extras.length
          ? `${existingUser ? "Existing account linked" : "User created"} for ${safeLabel}; ${extras.join(", ")}.`
          : `${existingUser ? "Existing account linked" : "User created"} for ${safeLabel}.`,
      );
      if (summary.failedCount > 0) {
        const firstFailure = summary.firstFailure ? toFriendlyDeliveryFailure(summary.firstFailure) : "";
        setActionError(
          `${existingUser ? "Account linked" : "User created"}, but ${summary.failedCount} credential message${summary.failedCount === 1 ? "" : "s"} failed.${firstFailure ? ` ${firstFailure}` : ""}`,
        );
      }
    });
  };

  const createUsersForIds = async (
    ids: number[],
    channels?: CreateUserDeliveryChannels,
  ) => {
    if (!ids.length) return;
    await runAction(async () => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          createUserFromProgramApplication(id, {
            channels: {
              email: channels?.email,
              sms: channels?.sms,
              whatsapp: channels?.sms,
            },
          }),
        ),
      );
      const createdMap = new Map<number, number>();
      results.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const createdUserId = Number((result.value as { user_id?: unknown }).user_id);
        if (!Number.isFinite(createdUserId) || createdUserId <= 0) return;
        createdMap.set(ids[index], createdUserId);
      });
      if (createdMap.size > 0) {
        setApplicants((current) =>
          current.map((entry) => ({
            ...entry,
            created_user_id: createdMap.get(entry.id) ?? entry.created_user_id,
          })),
        );
      }
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
        setActionSuccess(parts.join(" "));
      }

      if (failed.length || deliveryFailedCount > 0) {
        const messages: string[] = [];
        if (failed.length) {
          const firstReason = failed[0].status === "rejected" ? failed[0].reason : null;
          const reasonText = toFriendlyCreateUserError(firstReason, "One or more selected applicants", "PROGRAM_APPLICATION_NOT_FOUND");
          messages.push(`${failed.length} user create request${failed.length === 1 ? "" : "s"} failed. ${reasonText}`);
        }
        if (deliveryFailedCount > 0) {
          const friendlyFailure = firstDeliveryFailure ? toFriendlyDeliveryFailure(firstDeliveryFailure) : "";
          messages.push(
            `${deliveryFailedCount} credential message${deliveryFailedCount === 1 ? "" : "s"} failed.${friendlyFailure ? ` ${friendlyFailure}` : ""}`,
          );
        }
        setActionError(messages.join(" "));
      }
    });
  };

  const submitCreateUserModal = async (channels: CreateUserDeliveryChannels) => {
    if (!createUserTargetIds.length) return;
    if (createUserTargetIds.length === 1) {
      const target = composerApplicants.find((entry) => entry.id === createUserTargetIds[0]);
      const label = target?.name || "this applicant";
      await createSingleUser(createUserTargetIds[0], label, channels);
    } else {
      await createUsersForIds(createUserTargetIds, channels);
    }
    closeCreateUserModal();
  };

  const saveDetailReviewMessage = async () => {
    if (!selectedApplicationId || !detailData) return;
    const nextMessage = detailReviewMessageDraft.trim();
    if (!nextMessage) {
      setActionError("Review message cannot be empty.");
      return;
    }
    const currentMessage = String(detailData.program_application?.review_message ?? "").trim();
    if (nextMessage === currentMessage) return;

    const stage = toStage(String(detailData.program_application?.stage ?? "applied"));
    setSavingReviewMessage(true);
    setActionError("");
    try {
      await updateProgramApplicationStage(selectedApplicationId, {
        stage,
        review_message: nextMessage,
      });
      await loadApplications();
      await loadStatusCounts();
      await loadDetail(selectedApplicationId);
      setActionSuccess("Review message saved.");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Failed to save review message.");
    } finally {
      setSavingReviewMessage(false);
    }
  };

  const openScheduleModal = (id: number, name: string) => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 24);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);

    setScheduleTargetId(id);
    setScheduleTargetName(name);
    setScheduleInitial({
      scheduled_at: local,
      duration_minutes: 30,
      location_type: "online",
      location_details: "",
    });
    setScheduleError("");
    setScheduleModalOpen(true);
  };

  const closeScheduleModal = (force = false) => {
    if (scheduleBusy && !force) return;
    setScheduleModalOpen(false);
    setScheduleTargetId(null);
    setScheduleTargetName("");
    setScheduleError("");
  };

  const handleStageChangeRequest = async (
    id: number,
    nextStage: ProgramApplicationStage,
    fallbackName?: string | null,
    skipConfirmation = false,
  ) => {
    const target = applicants.find((entry) => entry.id === id);
    const currentStage = target ? toStage(target.stage) : "applied";
    const transitionWarning = getSkippedStageTransitionWarning(currentStage, nextStage, {
      confirmedLabel: "Confirmed",
    });
    if (!skipConfirmation && transitionWarning) {
      const confirmed = await requestConfirmation(
        "Confirm Stage Skip",
        `${transitionWarning}\n\nDo you want to continue?`,
      );
      if (!confirmed) {
        return;
      }
    }

    if (nextStage === "invited_to_interview") {
      const name =
        target?.full_name?.trim() ||
        target?.email?.trim() ||
        fallbackName?.trim() ||
        "Selected applicant";
      openScheduleModal(id, name);
      return;
    }

    const succeeded = await runAction(async () => {
      if (nextStage === "interview_confirmed") {
        await markProgramApplicationInterviewCompleted(id);
        return;
      }
      await updateProgramApplicationStage(id, {
        stage: nextStage,
        force_transition: Boolean(transitionWarning),
      });
    });
    if (succeeded && target) {
      setActionSuccess(
        `${target.full_name?.trim() || target.email?.trim() || "Applicant"} moved to ${workflowStatusLabel(nextStage, {
          confirmedLabel: "Confirmed",
        })}.`,
      );
    }
  };

  const submitScheduleModal = async (input: {
    scheduled_at: string;
    duration_minutes: number;
    location_type: InterviewLocationType;
    location_details: string;
  }) => {
    if (!scheduleTargetId) return;

    const target = applicants.find((entry) => entry.id === scheduleTargetId);
    const hasEmail = Boolean(target?.email?.trim());
    const hasPhone = Boolean(target?.phone?.trim());

    setScheduleBusy(true);
    setScheduleError("");
    try {
      await scheduleProgramApplicationInterview(scheduleTargetId, {
        scheduled_at: toIsoDateTime(input.scheduled_at),
        duration_minutes: input.duration_minutes,
        location_type: input.location_type,
        location_details: input.location_details || undefined,
        channels: hasEmail || hasPhone ? { email: hasEmail, sms: hasPhone } : undefined,
      });
      const targetName = target?.full_name?.trim() || target?.email?.trim() || scheduleTargetName || "Applicant";
      setActionSuccess(buildInterviewScheduleFeedback(targetName, hasEmail, hasPhone));
      setActionError("");

      setApplicants((current) =>
        current.map((entry) =>
          entry.id === scheduleTargetId ? { ...entry, stage: "invited_to_interview" } : entry,
        ),
      );

      await loadApplications();
      await loadStatusCounts();
      if (selectedApplicationId === scheduleTargetId) {
        await loadDetail(scheduleTargetId);
      }
      closeScheduleModal(true);
    } catch (error) {
      setScheduleError(
        error instanceof ApiError ? error.message : "Failed to schedule interview.",
      );
    } finally {
      setScheduleBusy(false);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleIds));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openApplication = async (id: number) => {
    setSelectedApplicationId(id);
    await loadDetail(id);
  };

  const openMessageComposer = (target?: { id?: number }) => {
    setActionSuccess("");
    const preselectedId = target?.id ?? null;
    setComposerPreselectedId(preselectedId);
    setComposerSingleId(preselectedId);
    if (preselectedId) {
      setComposerGroup("individual");
    } else if (selectedIds.size > 0) {
      setComposerGroup("selected");
    } else {
      setComposerGroup("all");
    }
    setComposerChannel("email");
    setComposerSubject("");
    setComposerBody("");
    setComposerShowTemplates(false);
    setComposerError("");
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setComposerPreselectedId(null);
    setComposerSingleId(null);
    setComposerShowTemplates(false);
    setComposerError("");
  };

  const closeApplicationModal = () => {
    setSelectedApplicationId(null);
    setDetailData(null);
    setDetailReviewMessageDraft("");
    setSavingReviewMessage(false);
    setDetailError("");
    setActionError("");
  };

  useEffect(() => {
    if (!selectedApplicationId && !composerOpen && !scheduleModalOpen && !createUserModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (scheduleModalOpen) closeScheduleModal();
        else if (createUserModalOpen) closeCreateUserModal();
        else if (composerOpen) closeComposer();
        else closeApplicationModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApplicationId, composerOpen, scheduleModalOpen, createUserModalOpen]);

  useEffect(() => {
    if (!composerOpen) return;
    if (composerPreselectedId) {
      setComposerSingleId(composerPreselectedId);
      setComposerGroup("individual");
      return;
    }
    if (selectedIds.size > 0) {
      setComposerGroup("selected");
      return;
    }
    setComposerGroup("all");
  }, [composerOpen, composerPreselectedId, selectedIds.size]);

  const sendComposerMessage = async () => {
    if (!composerRecipients.length) {
      setComposerError("No recipients selected.");
      return;
    }
    if (composerChannel === "email" && !composerSubject.trim()) {
      setComposerError("Subject is required for email.");
      return;
    }
    if (!composerBody.trim()) {
      setComposerError("Message body is required.");
      return;
    }

    const recipientsToSend = composerRecipients
      .map((recipient) => ({
        id: recipient.id,
        to: composerChannel === "email" ? recipient.email : recipient.phone,
      }))
      .filter((recipient) => recipient.to.trim().length > 0);

    if (!recipientsToSend.length) {
      setComposerError(composerChannel === "email" ? "Selected recipients do not have email addresses." : "Selected recipients do not have phone numbers.");
      return;
    }

    setComposerBusy(true);
    setComposerError("");
    setActionSuccess("");
    try {
      await Promise.all(
        recipientsToSend.map(async (recipient) => {
          const created = await createProgramApplicationMessage(recipient.id, {
            channel: composerChannel,
            to_value: recipient.to.trim(),
            subject: composerChannel === "email" ? composerSubject.trim() : undefined,
            body: composerBody.trim(),
          });
          await sendProgramApplicationMessage(recipient.id, created.id);
        }),
      );
      closeComposer();
      setActionSuccess(
        `Message sent to ${recipientsToSend.length} recipient${recipientsToSend.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setComposerError(error instanceof ApiError ? error.message : "Failed to send message.");
    } finally {
      setComposerBusy(false);
    }
  };

  return (
    <div className="popapply-page">
      <section className="popapply-apps">
          <div className="popapply-stage-filters popapply-stage-filters--tabs">
            <button type="button" className={activeFilter === "all" ? "popapply-stage-chip popapply-stage-chip--active" : "popapply-stage-chip"} onClick={() => setActiveFilter("all")}>
              <span className="popapply-stage-chip__label">All</span>
              <span className="popapply-stage-chip__count">{allStatusCount}</span>
            </button>
            {STATUS_ORDER.map((status) => (
              <button key={status} type="button" className={activeFilter === status ? "popapply-stage-chip popapply-stage-chip--active" : "popapply-stage-chip"} onClick={() => setActiveFilter(status)}>
                <span className="popapply-stage-chip__label">{workflowStatusLabel(status, { confirmedLabel: "Confirmed" })}</span>
                <span className="popapply-stage-chip__count">{statusCounts[status]}</span>
              </button>
            ))}
          </div>

          <div className="popapply-filters popapply-filters--top">
            <div className="popapply-search-wrap">
              <input className="popapply-search" placeholder="Search name, email..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </div>
            <div className="admx-header-actions">
              <button
                className="popapply-btn popapply-btn--outline popapply-filter-toggle"
                type="button"
                onClick={() => setCsvExportOpen(true)}
                disabled={applicants.length === 0}
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
                  <select className="popapply-input" value={sortBy} onChange={(event) => setSortBy(event.target.value as "created_at" | "updated_at" | "stage")}>
                    <option value="created_at">Created</option>
                    <option value="updated_at">Updated</option>
                    <option value="stage">Status</option>
                  </select>
                </div>
                <div className="popapply-control">
                  <label className="popapply-label">Order</label>
                  <select className="popapply-input" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}>
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
                <div className="popapply-control">
                  <label className="popapply-label">Program</label>
                  <select
                    className="popapply-input"
                    value={programFilter === "all" ? "all" : String(programFilter)}
                    onChange={(event) => {
                      const value = event.target.value;
                      setProgramFilter(value === "all" ? "all" : Number(value));
                      setPage(1);
                    }}
                  >
                    <option value="all">All Programs</option>
                    {programs.map((program) => (
                      <option key={program.id} value={String(program.id)}>
                        {program.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {selectedIds.size > 0 ? (
            <section className="admx-bulkbar">
              <div className="admx-bulkbar__left">
                <p>{selectedIds.size} applicant{selectedIds.size === 1 ? "" : "s"} selected</p>
                <button className="admx-bulkbar__clear" type="button" aria-label="Clear selected applicants" onClick={() => setSelectedIds(new Set())}>×</button>
              </div>
              <div className="admx-bulkbar__actions">
                <div className="admx-bulkbar__select-wrap">
                  <select className="admx-bulkbar__select" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as ProgramApplicationStage | "")} disabled={actionBusy}>
                    <option value="">Change status...</option>
                    {STATUS_ORDER.map((status) => <option key={status} value={status}>{workflowStatusLabel(status, { confirmedLabel: "Confirmed" })}</option>)}
                  </select>
                </div>
                <button
                  className="admx-bulkbar__apply"
                  type="button"
                  disabled={actionBusy || !bulkStatus}
                  onClick={() => {
                    void (async () => {
                      if (!bulkStatus) return;
                      if (bulkStatus === "invited_to_interview") {
                        setActionError("Bulk update to 'Invited to Interview' requires scheduling each interview individually.");
                        return;
                      }

                      const skippedTargets = applicants.filter(
                        (applicant) =>
                          selectedIds.has(applicant.id) &&
                          Boolean(
                            getSkippedStageTransitionWarning(toStage(applicant.stage), bulkStatus as ProgramApplicationStage, {
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
                          } and move them directly to ${workflowStatusLabel(bulkStatus as ProgramApplicationStage, {
                            confirmedLabel: "Confirmed",
                          })}.\n\nDo you want to continue?`,
                        ))
                      ) {
                        return;
                      }

                      void (async () => {
                        const succeeded = await runAction(async () => {
                          await Promise.all(
                            [...selectedIds].map((id) => {
                              if (bulkStatus === "interview_confirmed") {
                                return markProgramApplicationInterviewCompleted(id);
                              }
                              return updateProgramApplicationStage(id, {
                                stage: bulkStatus as ProgramApplicationStage,
                                force_transition: skippedTargets.some((applicant) => applicant.id === id),
                              });
                            }),
                          );
                          setSelectedIds(new Set());
                        });
                        if (succeeded) {
                          setActionSuccess(
                            `${selectedIds.size} applicant${selectedIds.size === 1 ? "" : "s"} moved to ${workflowStatusLabel(
                              bulkStatus as ProgramApplicationStage,
                              { confirmedLabel: "Confirmed" },
                            )}.`,
                          );
                        }
                      })();
                    })();
                  }}
                >
                  Apply
                </button>
                <button
                  className="btn btn--secondary btn--sm admx-create-user-btn"
                  type="button"
                  disabled={actionBusy || selectedCreateEligibleCount === 0}
                  onClick={() => {
                    const ids = [...selectedIds];
                    openCreateUserModal(
                      ids,
                      `${ids.length} selected applicant${ids.length === 1 ? "" : "s"}`,
                    );
                  }}
                >
                  {selectedCreateEligibleCount === 0
                    ? selectedApplicants.length === 1
                      ? "User Created"
                      : "Users Created"
                    : actionBusy
                      ? "Creating..."
                      : "Create User"}
                </button>
                <button
                  className="admx-bulkbar__message"
                  type="button"
                  disabled={actionBusy}
                  onClick={() => openMessageComposer()}
                >
                  <MessageIcon />
                  Message
                </button>
              </div>
            </section>
          ) : null}

          {actionSuccess ? <p className="popapply-success">{actionSuccess}</p> : null}

          <div className="popapply-table-wrap">
            <table className="popapply-table">
              <thead>
                <tr>
                  <th className="popapply-col-check"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>
                  <th>Applicant</th>
                  <th>Program</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th className="popapply-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingApplications ? (
                  <tr><td colSpan={6} className="popapply-empty">Loading...</td></tr>
                ) : applicants.length ? (
                  applicants.map((applicant) => {
                    const stage = toStage(applicant.stage);
                    const userCreated = hasCreatedUser(applicant.created_user_id);
                    return (
                      <tr key={applicant.id}>
                        <td className="popapply-col-check"><input type="checkbox" checked={selectedIds.has(applicant.id)} onChange={() => toggleSelect(applicant.id)} /></td>
                        <td><button className="popapply-name-btn" type="button" onClick={() => void openApplication(applicant.id)}>{applicant.full_name || applicant.email || "Unnamed applicant"}</button></td>
                        <td>{applicant.program_title}</td>
                        <td>{formatDate(applicant.created_at)}</td>
                        <td>
                          <select
                            className={`popapply-status-select ${statusClass(stage)}`}
                            value={stage}
                            onChange={(event) =>
                              void handleStageChangeRequest(
                                applicant.id,
                                event.target.value as ProgramApplicationStage,
                                applicant.full_name || applicant.email,
                              )
                            }
                          >
                            {STATUS_ORDER.map((status) => <option key={status} value={status}>{workflowStatusLabel(status, { confirmedLabel: "Confirmed" })}</option>)}
                          </select>
                        </td>
                        <td className="popapply-col-actions">
                          <div className="admx-row-actions">
                            <button
                              className="btn btn--secondary btn--sm admx-create-user-btn"
                              type="button"
                              disabled={actionBusy || userCreated}
                              onClick={() => {
                                const label = applicant.full_name || applicant.email || "this applicant";
                                openCreateUserModal([applicant.id], label);
                              }}
                            >
                              {userCreated ? "User Created" : actionBusy ? "Creating..." : "Create User"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={6} className="popapply-empty">{applicationsError || "No applications found."}</td></tr>
                )}
              </tbody>
            </table>

            <div className="popapply-table-footer">
              <p>Page {page} of {Math.max(totalPages, 1)} ({total} total)</p>
              <div className="popapply-pagination">
                <button className="popapply-btn popapply-btn--outline" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                <button className="popapply-btn popapply-btn--outline" type="button" disabled={totalPages > 0 && page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
              </div>
            </div>
          </div>

          {selectedApplicationId ? (
            <div className="popapply-modal-backdrop" role="dialog" aria-modal="true" onClick={closeApplicationModal}>
              <div className="popapply-modal" onClick={(event) => event.stopPropagation()}>
                <div className="popapply-modal-header">
                  <div>
                    <h3 className="popapply-modal-title">
                      {String(detailData?.applicant?.full_name ?? selectedApplication?.full_name ?? "Applicant")}
                    </h3>
                    <p className="popapply-modal-subtitle">
                      {String(detailData?.applicant?.email ?? selectedApplication?.email ?? "-")} • {String(detailData?.program?.title ?? selectedApplication?.program_title ?? "-")}
                    </p>
                  </div>
                  <div className="admx-modal__header-actions">
                    <button
                      className="btn btn--secondary btn--sm"
                      type="button"
                      onClick={() => openMessageComposer({ id: selectedApplicationId })}
                    >
                      Message Applicant
                    </button>
                    <button className="popapply-modal-close" type="button" aria-label="Close detail modal" title="Close" onClick={closeApplicationModal}>
                      X
                    </button>
                  </div>
                </div>

                <div className="popapply-modal-body">
                  {loadingDetail ? <p className="popapply-info">Loading application details...</p> : null}
                  {detailError ? <p className="popapply-error">{detailError}</p> : null}
                  {actionError ? <p className="popapply-error">{actionError}</p> : null}
                  {actionSuccess ? <p className="popapply-success">{actionSuccess}</p> : null}

                  {detailData ? (
                    <>
                      {submissionEntries.length ? (
                        <section className="popapply-modal-section">
                          <h4 className="popapply-section-title">Submitted Information</h4>
                          <div className="popapply-submitted-list">
                            {submissionEntries.map((entry) => (
                              <div key={entry.key} className="popapply-submitted-item">
                                <p className="popapply-submitted-label">{entry.label}</p>
                                <p className="popapply-submitted-value">{entry.value}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      <section className="popapply-modal-section">
                        <div className="admx-inline-head">
                          <h4 className="popapply-section-title">Review Message</h4>
                          <button
                            className="btn btn--secondary btn--sm"
                            type="button"
                            disabled={!canSaveReviewMessage}
                            onClick={() => {
                              void saveDetailReviewMessage();
                            }}
                          >
                            {savingReviewMessage ? "Saving..." : "Save"}
                          </button>
                        </div>
                        <textarea
                          className="textarea-control"
                          rows={3}
                          value={detailReviewMessageDraft}
                          onChange={(event) => setDetailReviewMessageDraft(event.target.value)}
                          placeholder="Add review feedback for this application."
                        />
                      </section>

                      <section className="popapply-modal-section">
                        <h4 className="popapply-section-title">Application Stage</h4>
                        <div className="popapply-stage-filters">
                          {STATUS_ORDER.map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={toStage(String(detailData.program_application.stage ?? "applied")) === status ? "popapply-stage-chip popapply-stage-chip--active" : "popapply-stage-chip"}
                              onClick={() =>
                                void handleStageChangeRequest(
                                  selectedApplicationId,
                                  status,
                                  String(
                                    detailData.applicant?.full_name ??
                                      detailData.applicant?.email ??
                                      selectedApplication?.full_name ??
                                      selectedApplication?.email ??
                                      "",
                                  ),
                                )
                              }
                            >
                              {workflowStatusLabel(status, { confirmedLabel: "Confirmed" })}
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="popapply-modal-section">
                        <div className="popapply-footer">
                          <button className="popapply-btn popapply-btn--outline" type="button" onClick={() => openMessageComposer({ id: selectedApplicationId })}>
                            Message Applicant
                          </button>
                          <button
                            className="popapply-btn popapply-btn--primary"
                            type="button"
                            disabled={
                              actionBusy ||
                              hasCreatedUser(
                                detailData.program_application?.created_user_id ??
                                  selectedApplication?.created_user_id,
                              )
                            }
                            onClick={() => {
                              const label = String(
                                detailData.applicant?.full_name ??
                                  detailData.applicant?.email ??
                                  selectedApplication?.full_name ??
                                  selectedApplication?.email ??
                                  "this applicant",
                              );
                              openCreateUserModal([selectedApplicationId], label);
                            }}
                          >
                            {hasCreatedUser(
                              detailData.program_application?.created_user_id ??
                                selectedApplication?.created_user_id,
                            )
                              ? "User Created"
                              : "Create User"}
                          </button>
                        </div>
                      </section>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <CreateUserDeliveryModal
            key={`${createUserTargetIds.join(",")}:${String(createUserInitialChannels.email)}:${String(createUserInitialChannels.sms)}`}
            open={createUserModalOpen}
            label={createUserLabel}
            recipients={createUserRecipients}
            initialChannels={createUserInitialChannels}
            busy={actionBusy}
            onClose={closeCreateUserModal}
            onSubmit={(channels) => {
              void submitCreateUserModal(channels);
            }}
          />

          {scheduleModalOpen ? (
            <InterviewSchedulerModal
              applicantName={scheduleTargetName || "Applicant"}
              busy={scheduleBusy}
              error={scheduleError}
              initial={scheduleInitial}
              onClose={() => closeScheduleModal()}
              onSubmit={(input) => void submitScheduleModal(input)}
            />
          ) : null}

          {composerOpen ? (
            <div className="admx-modal" role="presentation">
              <div className="admx-modal__backdrop" onClick={closeComposer} />
              <div className="admx-modal__card" role="dialog" aria-modal="true">
                <header className="admx-modal__header">
                  <div>
                    <h3>Compose Message</h3>
                    <p>{composerRecipients.length} recipient{composerRecipients.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="admx-switch">
                    <button className={composerChannel === "email" ? "admx-switch__btn admx-switch__btn--active" : "admx-switch__btn"} type="button" onClick={() => setComposerChannel("email")}>Email</button>
                    <button className={composerChannel === "sms" ? "admx-switch__btn admx-switch__btn--active" : "admx-switch__btn"} type="button" onClick={() => setComposerChannel("sms")}>WhatsApp</button>
                  </div>
                </header>
                <div className="admx-modal__body">
                  {composerError ? <p className="admx-inline-error">{composerError}</p> : null}
                  <label className="admx-label">Send To</label>
                  <div className="admx-chip-row">
                    <button className={composerGroup === "individual" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setComposerGroup("individual")}>Individual</button>
                    <button className={composerGroup === "selected" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setComposerGroup("selected")}>Selected ({selectedIdList.length})</button>
                    <button className={composerGroup === "all" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setComposerGroup("all")}>All ({composerApplicants.length})</button>
                    {STATUS_ORDER.map((status) => (
                      <button key={status} className={composerGroup === status ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setComposerGroup(status)}>
                        {status}
                      </button>
                    ))}
                  </div>

                  {composerGroup === "individual" ? (
                    <select className="field__control" value={composerSingleId ?? ""} onChange={(event) => setComposerSingleId(event.target.value ? Number(event.target.value) : null)}>
                      <option value="">Select applicant...</option>
                      {composerApplicants.map((entry) => (
                        <option key={entry.id} value={entry.id}>{entry.name} | {entry.programTitle}</option>
                      ))}
                    </select>
                  ) : null}

                  {composerChannel === "email" ? (
                    <input className="field__control" type="text" value={composerSubject} onChange={(event) => setComposerSubject(event.target.value)} placeholder="Subject" />
                  ) : null}

                  <div className="admx-inline-head">
                    <span className="admx-label">Message</span>
                    <button className="btn btn--secondary btn--sm" type="button" onClick={() => setComposerShowTemplates((value) => !value)}>Templates</button>
                  </div>

                  {composerShowTemplates ? (
                    <div className="admx-template-grid">
                      {visibleMessageTemplates.map((template) => (
                        <button
                          key={template.key}
                          className="admx-template"
                          type="button"
                          onClick={() => {
                            const tokens: Record<string, string> = {};
                            if (composerRecipients.length === 1) {
                              tokens.name = composerRecipients[0].name.split(" ")[0];
                            }
                            setComposerSubject(applyTemplateTokens(template.subject || template.label, tokens));
                            setComposerBody(applyTemplateTokens(template.body, tokens));
                            setComposerShowTemplates(false);
                          }}
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <textarea className="textarea-control" rows={composerChannel === "sms" ? 4 : 8} value={composerBody} onChange={(event) => setComposerBody(event.target.value)} />
                </div>
                <footer className="admx-modal__footer">
                  <button className="btn btn--secondary" type="button" onClick={closeComposer} disabled={composerBusy}>Cancel</button>
                  <button className="btn btn--primary" type="button" disabled={!composerCanSend || composerBusy} onClick={() => void sendComposerMessage()}>
                    {composerBusy ? "Sending..." : `Send to ${composerRecipients.length || "-"}`}
                  </button>
                </footer>
              </div>
            </div>
          ) : null}

          {csvExportOpen ? (
            <CsvExportModal<ProgramApplicationListItem>
              onClose={() => setCsvExportOpen(false)}
              title="Export General Apply CSV"
              filename={`general-apply-${new Date().toISOString().slice(0, 10)}`}
              columns={csvColumns}
              rowScopes={csvRowScopes}
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

      </section>
    </div>
  );
}

