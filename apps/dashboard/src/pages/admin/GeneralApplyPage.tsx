import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CsvExportModal, type CsvExportColumn } from "../../components/CsvExportModal";
import {
  type MessageTemplate,
  type ProgramApplicationFormField,
  type ProgramApplicationFormFieldType,
  type ProgramApplicationListItem,
  type ProgramApplicationStage,
  createProgramApplicationMessage,
  createUserFromProgramApplication,
  getProgramApplicationDetail,
  getProgramApplicationForm,
  listMessageTemplates,
  listProgramApplications,
  scheduleProgramApplicationInterview,
  sendProgramApplicationMessage,
  updateProgramApplicationFormFields,
  updateProgramApplicationStage,
} from "../../lib/api";
import { useGlobalMessagingContext } from "../../components/GlobalMessagingContext";
import {
  applyTemplateTokens,
  FALLBACK_MESSAGE_TEMPLATES,
  filterTemplatesForChannel,
} from "../../lib/messageTemplates";
import { summarizeOnboardingMessage } from "../../lib/onboardingMessage";
import { ApiError, apiList } from "../../utils/api";
import "./GeneralApplyPage.css";

type PageTab = "applications" | "form";
type ApplicationFilter = "all" | ProgramApplicationStage;
type FieldOptionSource = "manual" | "programs";
type RecipientGroup = "individual" | "all" | "selected" | ProgramApplicationStage;
type InterviewLocationType = "online" | "in_person" | "phone";

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

type EditableField = {
  id: string;
  name: string;
  label: string;
  type: ProgramApplicationFormFieldType;
  required: boolean;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  is_enabled: boolean;
};

type NewFieldDraft = {
  label: string;
  type: ProgramApplicationFormFieldType;
  required: boolean;
  placeholder: string;
  optionsText: string;
  optionsSource: FieldOptionSource;
};

type FieldEditDraft = {
  label: string;
  name: string;
  type: ProgramApplicationFormFieldType;
  required: boolean;
  placeholder: string;
  optionsText: string;
  optionsSource: FieldOptionSource;
  is_enabled: boolean;
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

const FIELD_TYPE_OPTIONS: ProgramApplicationFormFieldType[] = [
  "text",
  "textarea",
  "email",
  "phone",
  "select",
  "checkbox",
  "date",
  "file",
];

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

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="6" r="1.2" />
      <circle cx="15" cy="6" r="1.2" />
      <circle cx="9" cy="12" r="1.2" />
      <circle cx="15" cy="12" r="1.2" />
      <circle cx="9" cy="18" r="1.2" />
      <circle cx="15" cy="18" r="1.2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function toSafeFieldName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64);
}

function toStage(value: string): ProgramApplicationStage {
  return STATUS_ORDER.includes(value as ProgramApplicationStage) ? (value as ProgramApplicationStage) : "applied";
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

function statusLabel(status: ProgramApplicationStage): string {
  switch (status) {
    case "invited_to_interview":
      return "Invited to Interview";
    case "interview_confirmed":
      return "Interview Confirmed";
    case "participation_confirmed":
      return "Confirmed";
    case "applied":
      return "Applied";
    case "reviewing":
      return "Reviewing";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    default:
      return status;
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

function parseOptions(options: unknown): Array<{ label: string; value: string }> {
  if (Array.isArray(options)) {
    return options
      .map((item) => {
        if (typeof item === "string") return { label: item, value: item };
        if (item && typeof item === "object") {
          const value = item as { label?: unknown; value?: unknown };
          if (typeof value.label === "string" && typeof value.value === "string") {
            return { label: value.label, value: value.value };
          }
        }
        return null;
      })
      .filter((entry): entry is { label: string; value: string } => Boolean(entry));
  }

  if (options && typeof options === "object") {
    const choices = (options as { choices?: unknown }).choices;
    if (Array.isArray(choices)) {
      return choices
        .map((item) => (typeof item === "string" ? { label: item, value: item } : null))
        .filter((entry): entry is { label: string; value: string } => Boolean(entry));
    }
  }

  return [];
}

function toOptionsText(options: Array<{ label: string; value: string }>): string {
  if (!options.length) return "";
  return options.map((entry) => entry.label || entry.value).join(", ");
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

function getSubmissionEntries(submissionAnswers: unknown): Array<{ key: string; label: string; value: string }> {
  if (!submissionAnswers || typeof submissionAnswers !== "object" || Array.isArray(submissionAnswers)) {
    return [];
  }

  return Object.entries(submissionAnswers as Record<string, unknown>).map(([key, value]) => ({
    key,
    label: toSubmittedLabel(key),
    value: toSubmittedValue(value),
  }));
}

type InterviewSchedulerModalProps = {
  open: boolean;
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
  open,
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

  useEffect(() => {
    if (!open) return;
    setScheduledAt(initial.scheduled_at);
    setDurationMinutes(initial.duration_minutes);
    setLocationType(initial.location_type);
    setLocationDetails(initial.location_details);
  }, [open, initial]);

  if (!open) return null;

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
            {busy ? "Scheduling..." : "Schedule & Set Invited"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function GeneralApplyPage() {
  const { setPageData: setGlobalMessagingPageData } = useGlobalMessagingContext();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<PageTab>("applications");
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
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");

  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTargetId, setScheduleTargetId] = useState<number | null>(null);
  const [scheduleTargetName, setScheduleTargetName] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleInitial, setScheduleInitial] = useState({
    scheduled_at: "",
    duration_minutes: 30,
    location_type: "online" as InterviewLocationType,
    location_details: "",
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

  const [fields, setFields] = useState<EditableField[]>([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [savingFormFields, setSavingFormFields] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldEditDraft, setFieldEditDraft] = useState<FieldEditDraft | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [newField, setNewField] = useState<NewFieldDraft>({
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    optionsText: "",
    optionsSource: "manual",
  });

  useEffect(() => {
    const sourceParam = String(searchParams.get("source") || "").trim().toLowerCase();
    const tabParam = String(searchParams.get("tab") || "").trim().toLowerCase();
    const stageParam = String(searchParams.get("stage") || "").trim().toLowerCase();
    const programIdParam = String(searchParams.get("program_id") || "").trim();
    const searchParam = searchParams.get("search");
    const sortByParam = String(searchParams.get("sortBy") || "").trim().toLowerCase();
    const orderParam = String(searchParams.get("order") || "").trim().toLowerCase();
    const focusParam = String(searchParams.get("focus") || "").trim().toLowerCase();

    if (tabParam === "form") {
      setActiveTab("form");
    } else if (tabParam === "applications") {
      setActiveTab("applications");
    }

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
      if (!tabParam) {
        setActiveTab("applications");
      }
    }
  }, [searchParams]);

  const addFieldCardRef = useRef<HTMLDivElement | null>(null);
  const addFieldLabelRef = useRef<HTMLInputElement | null>(null);

  const selectedApplication = useMemo(() => applicants.find((item) => item.id === selectedApplicationId) ?? null, [applicants, selectedApplicationId]);
  const submissionEntries = useMemo(
    () => getSubmissionEntries(detailData?.program_application?.submission_answers),
    [detailData],
  );
  const composerApplicants = useMemo<ComposerRecipient[]>(
    () =>
      applicants.map((item) => ({
        id: item.id,
        name: item.full_name?.trim() || item.email?.trim() || `Application #${item.id}`,
        email: item.email?.trim() || "",
        phone: item.phone?.trim() || "",
        stage: toStage(item.stage),
        programTitle: item.program_title,
      })),
    [applicants],
  );
  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);
  const selectedExportRows = useMemo(
    () => applicants.filter((row) => selectedIds.has(row.id)),
    [applicants, selectedIds],
  );
  const csvColumns = useMemo<CsvExportColumn<ProgramApplicationListItem>[]>(
    () => [
      { key: "applicant", label: "Applicant", getValue: (row) => row.full_name || row.email || `Application #${row.id}` },
      { key: "email", label: "Email", getValue: (row) => row.email || "" },
      { key: "phone", label: "Phone", getValue: (row) => row.phone || "" },
      { key: "program", label: "Program", getValue: (row) => row.program_title },
      { key: "applied", label: "Applied", getValue: (row) => formatDate(row.created_at) },
      { key: "status", label: "Status", getValue: (row) => statusLabel(toStage(row.stage)) },
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
    if (activeTab !== "applications") {
      setGlobalMessagingPageData(null);
      return;
    }

    setGlobalMessagingPageData({
      scope: "program_applications",
      recipients: applicants.map((entry) => ({
        id: String(entry.id),
        name: entry.full_name?.trim() || entry.email?.trim() || `Application #${entry.id}`,
        email: entry.email?.trim() || "",
        phone: entry.phone?.trim() || "",
        status: toStage(entry.stage),
        meta: entry.program_title,
      })),
      selectedRecipientIds: [...selectedIds].map((value) => String(value)),
      statusOptions: [...STATUS_ORDER],
    });

    return () => setGlobalMessagingPageData(null);
  }, [activeTab, applicants, selectedIds, setGlobalMessagingPageData]);

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
    } catch (error) {
      setDetailError(error instanceof ApiError ? error.message : "Failed to load application detail.");
      setDetailData(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadProgramForm = async () => {
    setLoadingForm(true);
    setFormError("");
    try {
      const payload = await getProgramApplicationForm();
      setEditingFieldId(null);
      setFieldEditDraft(null);
      setDragFromIndex(null);
      setDragOverIndex(null);
      setFields(
        payload.fields.map((field, index) => ({
          id: String(field.id ?? `field-${index}`),
          name: field.name || toSafeFieldName(field.label || `field_${index + 1}`),
          label: field.label || `Field ${index + 1}`,
          type: field.type,
          required: Boolean(field.required),
          placeholder: field.placeholder ?? "",
          options: parseOptions(field.options),
          is_enabled: field.is_enabled !== false,
        })),
      );
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Failed to load form.");
    } finally {
      setLoadingForm(false);
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
    if (activeTab === "form") {
      void loadProgramForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    let active = true;
    const loadPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const result = await apiList<ProgramOption>("/programs?limit=100&sortBy=title&order=asc");
        if (!active) return;
        setPrograms(result.data);
      } catch {
        if (!active) return;
        setPrograms([]);
      } finally {
        if (active) setLoadingPrograms(false);
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
        const templates = await listMessageTemplates();
        if (!active) return;
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
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Operation failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const createSingleUser = async (id: number, label?: string | null) => {
    await runAction(async () => {
      const response = await createUserFromProgramApplication(id);
      const summary = summarizeOnboardingMessage(response);
      const extras: string[] = [];
      if (summary.sentCount > 0) extras.push(`credentials sent (${summary.sentCount})`);
      if (summary.skipped) extras.push("delivery skipped");
      setActionSuccess(
        extras.length
          ? `User created for ${label?.trim() || `application #${id}`}; ${extras.join(", ")}.`
          : `User created for ${label?.trim() || `application #${id}`}.`,
      );
      if (summary.failedCount > 0) {
        setActionError(
          `User created, but ${summary.failedCount} credential message${summary.failedCount === 1 ? "" : "s"} failed.${summary.firstFailure ? ` ${summary.firstFailure}` : ""}`,
        );
      }
    });
  };

  const createUsersForSelected = async () => {
    if (!selectedIds.size) return;

    await runAction(async () => {
      const results = await Promise.allSettled(
        [...selectedIds].map((id) => createUserFromProgramApplication(id)),
      );
      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.filter((result) => result.status === "rejected");
      const summaries = results
        .filter((result): result is PromiseFulfilledResult<Record<string, unknown>> => result.status === "fulfilled")
        .map((result) => summarizeOnboardingMessage(result.value));
      const sentCount = summaries.reduce((acc, item) => acc + item.sentCount, 0);
      const deliveryFailedCount = summaries.reduce((acc, item) => acc + item.failedCount, 0);
      const skippedCount = summaries.reduce((acc, item) => acc + (item.skipped ? 1 : 0), 0);
      const firstDeliveryFailure = summaries.find((item) => item.firstFailure)?.firstFailure || "";

      if (successCount > 0) {
        const parts = [`Created ${successCount} user${successCount === 1 ? "" : "s"}.`];
        if (sentCount > 0) parts.push(`Credentials sent: ${sentCount}.`);
        if (skippedCount > 0) parts.push(`Delivery skipped: ${skippedCount}.`);
        setActionSuccess(parts.join(" "));
      }

      if (failed.length || deliveryFailedCount > 0) {
        const messages: string[] = [];
        if (failed.length) {
          const firstReason = failed[0].status === "rejected" ? failed[0].reason : null;
          const reasonText = firstReason instanceof ApiError ? firstReason.message : "Some users could not be created.";
          messages.push(`${failed.length} user create request${failed.length === 1 ? "" : "s"} failed. ${reasonText}`);
        }
        if (deliveryFailedCount > 0) {
          messages.push(
            `${deliveryFailedCount} credential message${deliveryFailedCount === 1 ? "" : "s"} failed.${firstDeliveryFailure ? ` ${firstDeliveryFailure}` : ""}`,
          );
        }
        setActionError(messages.join(" "));
      }
    });
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
  ) => {
    if (nextStage === "invited_to_interview") {
      const target = applicants.find((entry) => entry.id === id);
      const name =
        target?.full_name?.trim() ||
        target?.email?.trim() ||
        fallbackName?.trim() ||
        `Application #${id}`;
      openScheduleModal(id, name);
      return;
    }

    await runAction(async () => {
      await updateProgramApplicationStage(id, { stage: nextStage });
    });
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
    setDetailError("");
    setActionError("");
  };

  useEffect(() => {
    if (!selectedApplicationId && !composerOpen && !scheduleModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (scheduleModalOpen) closeScheduleModal();
        else if (composerOpen) closeComposer();
        else closeApplicationModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApplicationId, composerOpen, scheduleModalOpen]);

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

  const toProgramApplicationFieldPayload = (nextFields: EditableField[]): ProgramApplicationFormField[] => {
    return nextFields.map((field, index) => {
      const row: ProgramApplicationFormField = {
        name: toSafeFieldName(field.name || field.label) || `field_${index + 1}`,
        label: field.label || `Field ${index + 1}`,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder || null,
        sort_order: index,
        is_enabled: field.is_enabled,
      };
      if (field.type === "select" || field.type === "checkbox") row.options = field.options;
      return row;
    });
  };

  const persistFields = async (nextFields: EditableField[]) => {
    setFields(nextFields);
    setSavingFormFields(true);
    setFormError("");
    try {
      await updateProgramApplicationFormFields({
        fields: toProgramApplicationFieldPayload(nextFields),
      });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Failed to save fields.");
      await loadProgramForm();
    } finally {
      setSavingFormFields(false);
    }
  };

  const addField = async () => {
    if (!newField.label.trim()) return;
    const options =
      newField.type === "select" && newField.optionsSource === "programs"
        ? programs.map((program) => ({ label: program.title, value: String(program.id) }))
        : newField.optionsText
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => ({ label: value, value }));

    const nextFields = [
      ...fields,
      {
        id: `new-${Date.now()}-${fields.length}`,
        name: toSafeFieldName(newField.label) || `field_${fields.length + 1}`,
        label: newField.label,
        type: newField.type,
        required: newField.required,
        placeholder: newField.placeholder,
        options,
        is_enabled: true,
      },
    ];

    await persistFields(nextFields);
    setNewField({ label: "", type: "text", required: false, placeholder: "", optionsText: "", optionsSource: "manual" });
    setIsAdding(false);
  };

  const startEditField = (field: EditableField) => {
    setEditingFieldId(field.id);
    setFieldEditDraft({
      label: field.label,
      name: field.name,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder,
      optionsText: toOptionsText(field.options),
      optionsSource:
        field.type === "select" &&
        field.options.length > 0 &&
        field.options.every((entry) => programs.some((program) => String(program.id) === entry.value))
          ? "programs"
          : "manual",
      is_enabled: field.is_enabled,
    });
  };

  const saveEditedField = async (fieldId: string) => {
    if (!fieldEditDraft) return;
    const options =
      fieldEditDraft.type === "select" && fieldEditDraft.optionsSource === "programs"
        ? programs.map((program) => ({ label: program.title, value: String(program.id) }))
        : fieldEditDraft.optionsText
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => ({ label: value, value }));

    const nextFields = fields.map((field) =>
      field.id === fieldId
        ? {
            ...field,
            label: fieldEditDraft.label.trim() || field.label,
            name: toSafeFieldName(fieldEditDraft.name || fieldEditDraft.label) || field.name,
            type: fieldEditDraft.type,
            required: fieldEditDraft.required,
            placeholder: fieldEditDraft.placeholder,
            options: fieldEditDraft.type === "select" || fieldEditDraft.type === "checkbox" ? options : [],
            is_enabled: fieldEditDraft.is_enabled,
          }
        : field,
    );

    await persistFields(nextFields);
    setEditingFieldId(null);
    setFieldEditDraft(null);
  };

  const moveField = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const clone = [...fields];
    const [item] = clone.splice(index, 1);
    clone.splice(targetIndex, 0, item);
    await persistFields(clone);
  };

  const handleFieldDragStart = (index: number, event: DragEvent<HTMLDivElement>) => {
    if (savingFormFields) return;
    setDragFromIndex(index);
    setDragOverIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleFieldDrop = async (dropIndex: number) => {
    if (dragFromIndex === null) return;
    if (dragFromIndex === dropIndex) {
      setDragFromIndex(null);
      setDragOverIndex(null);
      return;
    }
    const clone = [...fields];
    const [item] = clone.splice(dragFromIndex, 1);
    clone.splice(dropIndex, 0, item);
    setDragFromIndex(null);
    setDragOverIndex(null);
    await persistFields(clone);
  };

  const handleFieldDragEnd = () => {
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const removeField = async (fieldId: string) => {
    const nextFields = fields.filter((item) => item.id !== fieldId);
    await persistFields(nextFields);
    if (editingFieldId === fieldId) {
      setEditingFieldId(null);
      setFieldEditDraft(null);
    }
  };

  const confirmDeleteField = async (field: EditableField) => {
    const confirmed = window.confirm(`Delete field "${field.label}"?`);
    if (!confirmed) return;
    await removeField(field.id);
  };

  const openAddField = () => {
    setEditingFieldId(null);
    setFieldEditDraft(null);
    if (isAdding) {
      addFieldCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      addFieldLabelRef.current?.focus();
      return;
    }
    setIsAdding(true);
  };

  useEffect(() => {
    if (!isAdding) return;
    addFieldCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    addFieldLabelRef.current?.focus();
  }, [isAdding]);

  const cancelEditField = () => {
    setEditingFieldId(null);
    setFieldEditDraft(null);
  };

  return (
    <div className="popapply-page">
      <header className="popapply-topnav">
        <nav className="popapply-tabs" aria-label="General Apply tabs">
          <button type="button" className={activeTab === "applications" ? "popapply-tab popapply-tab--active" : "popapply-tab"} onClick={() => setActiveTab("applications")}>
            Applications
          </button>
          <button type="button" className={activeTab === "form" ? "popapply-tab popapply-tab--active" : "popapply-tab"} onClick={() => setActiveTab("form")}>
            Form Management
          </button>
        </nav>
      </header>

      {activeTab === "applications" ? (
        <section className="popapply-apps">
          <div className="popapply-stage-filters popapply-stage-filters--tabs">
            <button type="button" className={activeFilter === "all" ? "popapply-stage-chip popapply-stage-chip--active" : "popapply-stage-chip"} onClick={() => setActiveFilter("all")}>
              <span className="popapply-stage-chip__label">All</span>
              <span className="popapply-stage-chip__count">{allStatusCount}</span>
            </button>
            {STATUS_ORDER.map((status) => (
              <button key={status} type="button" className={activeFilter === status ? "popapply-stage-chip popapply-stage-chip--active" : "popapply-stage-chip"} onClick={() => setActiveFilter(status)}>
                <span className="popapply-stage-chip__label">{statusLabel(status)}</span>
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
                    {STATUS_ORDER.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </select>
                </div>
                <button
                  className="admx-bulkbar__apply"
                  type="button"
                  disabled={actionBusy || !bulkStatus}
                  onClick={() => {
                    if (!bulkStatus) return;
                    if (bulkStatus === "invited_to_interview") {
                      setActionError("Bulk update to 'Invited to Interview' requires scheduling each interview individually.");
                      return;
                    }
                    void runAction(async () => {
                      await Promise.all(
                        [...selectedIds].map((id) =>
                          updateProgramApplicationStage(id, { stage: bulkStatus as ProgramApplicationStage }),
                        ),
                      );
                      setSelectedIds(new Set());
                    });
                  }}
                >
                  Apply
                </button>
                <button
                  className="btn btn--secondary btn--sm admx-create-user-btn"
                  type="button"
                  disabled={actionBusy}
                  onClick={() => {
                    if (!window.confirm(`Create user accounts and send credentials to ${selectedIds.size} selected applicant${selectedIds.size === 1 ? "" : "s"}?`)) return;
                    void createUsersForSelected();
                  }}
                >
                  {actionBusy ? "Creating..." : "Create User"}
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
                    return (
                      <tr key={applicant.id}>
                        <td className="popapply-col-check"><input type="checkbox" checked={selectedIds.has(applicant.id)} onChange={() => toggleSelect(applicant.id)} /></td>
                        <td><button className="popapply-name-btn" type="button" onClick={() => void openApplication(applicant.id)}>{applicant.full_name || applicant.email || `Application #${applicant.id}`}</button></td>
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
                            {STATUS_ORDER.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                          </select>
                        </td>
                        <td className="popapply-col-actions">
                          <div className="admx-row-actions">
                            <button
                              className="btn btn--secondary btn--sm admx-create-user-btn"
                              type="button"
                              disabled={actionBusy}
                              onClick={() => {
                                const label = applicant.full_name || applicant.email || `application #${applicant.id}`;
                                if (!window.confirm(`Create user for ${label} and send credentials message?`)) return;
                                void createSingleUser(
                                  applicant.id,
                                  label,
                                );
                              }}
                            >
                              {actionBusy ? "Creating..." : "Create User"}
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
                      {String(detailData?.applicant?.full_name ?? selectedApplication?.full_name ?? `Application #${selectedApplicationId}`)}
                    </h3>
                    <p className="popapply-modal-subtitle">
                      {String(detailData?.applicant?.email ?? selectedApplication?.email ?? "-")} • {String(detailData?.program?.title ?? selectedApplication?.program_title ?? "-")}
                    </p>
                  </div>
                  <button className="popapply-modal-close" type="button" aria-label="Close detail modal" onClick={closeApplicationModal}>x</button>
                </div>

                <div className="popapply-modal-body">
                  {loadingDetail ? <p className="popapply-info">Loading detail...</p> : null}
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
                              {statusLabel(status)}
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
                            disabled={actionBusy}
                            onClick={() => {
                              const label = String(
                                detailData.applicant?.full_name ??
                                  detailData.applicant?.email ??
                                  selectedApplication?.full_name ??
                                  selectedApplication?.email ??
                                  `application #${selectedApplicationId}`,
                              );
                              if (!window.confirm(`Create user for ${label} and send credentials message?`)) return;
                              void runAction(async () => createUserFromProgramApplication(selectedApplicationId));
                            }}
                          >
                            Create User
                          </button>
                        </div>
                      </section>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <InterviewSchedulerModal
            open={scheduleModalOpen}
            applicantName={scheduleTargetName || "Applicant"}
            busy={scheduleBusy}
            error={scheduleError}
            initial={scheduleInitial}
            onClose={() => closeScheduleModal()}
            onSubmit={(input) => void submitScheduleModal(input)}
          />

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

          <CsvExportModal<ProgramApplicationListItem>
            open={csvExportOpen}
            onClose={() => setCsvExportOpen(false)}
            title="Export General Apply CSV"
            filename={`general-apply-${new Date().toISOString().slice(0, 10)}`}
            columns={csvColumns}
            rowScopes={csvRowScopes}
          />

        </section>
      ) : (
        <section className="popapply-form-container">
          <div className="popapply-header">
            <div>
              <h2 className="popapply-title">Application Form</h2>
            </div>
            <button className="popapply-btn popapply-btn--primary" type="button" onClick={openAddField}>Add Field</button>
          </div>

          {loadingForm ? <p className="popapply-info">Loading form...</p> : null}
          {formError ? <p className="popapply-error">{formError}</p> : null}

          {isAdding ? (
            <div className="popapply-card popapply-card--add" ref={addFieldCardRef}>
              <div className="popapply-card-header"><h3 className="popapply-card-title">Add New Field</h3></div>
              <div className="popapply-card-content">
                <div className="popapply-grid">
                  <div className="popapply-control"><label className="popapply-label">Label</label><input ref={addFieldLabelRef} className="popapply-input" value={newField.label} onChange={(event) => setNewField((current) => ({ ...current, label: event.target.value }))} /></div>
                  <div className="popapply-control"><label className="popapply-label">Type</label><select className="popapply-input" value={newField.type} onChange={(event) => setNewField((current) => ({ ...current, type: event.target.value as ProgramApplicationFormFieldType }))}>{FIELD_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                  {newField.type === "select" ? <div className="popapply-control"><label className="popapply-label">Options Source</label><select className="popapply-input" value={newField.optionsSource} onChange={(event) => setNewField((current) => ({ ...current, optionsSource: event.target.value as FieldOptionSource }))}><option value="manual">manual</option><option value="programs">programs</option></select></div> : null}
                  <div className="popapply-control"><label className="popapply-label">Placeholder</label><input className="popapply-input" value={newField.placeholder} onChange={(event) => setNewField((current) => ({ ...current, placeholder: event.target.value }))} /></div>
                  {(newField.type === "select" || newField.type === "checkbox") && (newField.type !== "select" || newField.optionsSource === "manual") ? <div className="popapply-control"><label className="popapply-label">Options (comma)</label><input className="popapply-input" value={newField.optionsText} onChange={(event) => setNewField((current) => ({ ...current, optionsText: event.target.value }))} /></div> : null}
                  {newField.type === "select" && newField.optionsSource === "programs" ? <p className="popapply-info">{loadingPrograms ? "Loading programs..." : `${programs.length} programs loaded; value uses id.`}</p> : null}
                  <label className="popapply-checkbox-wrap"><input className="popapply-checkbox" type="checkbox" checked={newField.required} onChange={(event) => setNewField((current) => ({ ...current, required: event.target.checked }))} /><span>Required</span></label>
                </div>
                <div className="popapply-footer">
                  <button className="popapply-btn popapply-btn--ghost" type="button" onClick={() => setIsAdding(false)}>Cancel</button>
                  <button className="popapply-btn popapply-btn--primary" type="button" onClick={() => void addField()} disabled={!newField.label.trim() || savingFormFields}>{savingFormFields ? "Saving..." : "Add Field"}</button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="popapply-fields">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={
                  editingFieldId === field.id
                    ? `popapply-field-row popapply-field-row--editing${dragOverIndex === index && dragFromIndex !== index ? " popapply-field-row--drag-over" : ""}`
                    : `popapply-field-row${dragOverIndex === index && dragFromIndex !== index ? " popapply-field-row--drag-over" : ""}`
                }
                onDragOver={(event) => {
                  if (dragFromIndex === null || savingFormFields) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverIndex !== index) setDragOverIndex(index);
                }}
                onDrop={(event) => {
                  if (savingFormFields) return;
                  event.preventDefault();
                  void handleFieldDrop(index);
                }}
              >
                <div
                  className="popapply-drag-handle"
                  draggable={!savingFormFields}
                  onDragStart={(event) => handleFieldDragStart(index, event)}
                  onDragEnd={handleFieldDragEnd}
                  title="Drag to reorder"
                >
                  <GripIcon />
                </div>
                <div className="popapply-field-body">
                  <div className="popapply-field-head"><h3 className="popapply-field-label">{field.label}</h3>{field.required ? <span className="popapply-required">Required</span> : null}{!field.is_enabled ? <span className="popapply-required">Disabled</span> : null}</div>
                  <div className="popapply-field-meta"><span className="popapply-type-chip">{field.type}</span><span className="popapply-options-chip">name: {field.name}</span></div>

                  {editingFieldId === field.id && fieldEditDraft ? (
                    <div className="popapply-field-inline-edit">
                      <div className="popapply-grid">
                        <div className="popapply-control"><label className="popapply-label">Label</label><input className="popapply-input" value={fieldEditDraft.label} onChange={(event) => setFieldEditDraft((current) => current ? { ...current, label: event.target.value } : current)} /></div>
                        <div className="popapply-control"><label className="popapply-label">Name</label><input className="popapply-input" value={fieldEditDraft.name} onChange={(event) => setFieldEditDraft((current) => current ? { ...current, name: event.target.value } : current)} /></div>
                        <div className="popapply-control"><label className="popapply-label">Type</label><select className="popapply-input" value={fieldEditDraft.type} onChange={(event) => setFieldEditDraft((current) => current ? { ...current, type: event.target.value as ProgramApplicationFormFieldType } : current)}>{FIELD_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                        {fieldEditDraft.type === "select" ? <div className="popapply-control"><label className="popapply-label">Options Source</label><select className="popapply-input" value={fieldEditDraft.optionsSource} onChange={(event) => setFieldEditDraft((current) => current ? { ...current, optionsSource: event.target.value as FieldOptionSource } : current)}><option value="manual">manual</option><option value="programs">programs</option></select></div> : null}
                        <div className="popapply-control"><label className="popapply-label">Placeholder</label><input className="popapply-input" value={fieldEditDraft.placeholder} onChange={(event) => setFieldEditDraft((current) => current ? { ...current, placeholder: event.target.value } : current)} /></div>
                        {(fieldEditDraft.type === "select" || fieldEditDraft.type === "checkbox") && (fieldEditDraft.type !== "select" || fieldEditDraft.optionsSource === "manual") ? <div className="popapply-control"><label className="popapply-label">Options (comma)</label><input className="popapply-input" value={fieldEditDraft.optionsText} onChange={(event) => setFieldEditDraft((current) => current ? { ...current, optionsText: event.target.value } : current)} /></div> : null}
                        {fieldEditDraft.type === "select" && fieldEditDraft.optionsSource === "programs" ? <p className="popapply-info">{loadingPrograms ? "Loading programs..." : `${programs.length} programs loaded; value uses id.`}</p> : null}
                      </div>
                      <div className="popapply-inline-footer">
                        <div className="popapply-inline-checkboxes">
                          <label className="popapply-checkbox-wrap"><input className="popapply-checkbox" type="checkbox" checked={fieldEditDraft.required} onChange={(event) => setFieldEditDraft((current) => current ? { ...current, required: event.target.checked } : current)} /><span>Required</span></label>
                          <label className="popapply-checkbox-wrap"><input className="popapply-checkbox" type="checkbox" checked={fieldEditDraft.is_enabled} onChange={(event) => setFieldEditDraft((current) => current ? { ...current, is_enabled: event.target.checked } : current)} /><span>Enabled</span></label>
                        </div>
                        <div className="popapply-inline-actions">
                          <button className="popapply-btn popapply-btn--icon popapply-btn--ghost" type="button" disabled={index === 0 || savingFormFields} onClick={() => void moveField(index, -1)}>↑</button>
                          <button className="popapply-btn popapply-btn--icon popapply-btn--ghost" type="button" disabled={index === fields.length - 1 || savingFormFields} onClick={() => void moveField(index, 1)}>↓</button>
                          <button className="popapply-btn popapply-btn--outline" type="button" disabled={savingFormFields || !fieldEditDraft?.label.trim()} onClick={() => void saveEditedField(field.id)}>{savingFormFields ? "Saving..." : "Save"}</button>
                          <button className="popapply-btn popapply-btn--ghost" type="button" disabled={savingFormFields} onClick={cancelEditField}>Cancel</button>
                          <button className="popapply-btn popapply-btn--icon popapply-btn--ghost popapply-btn--danger-hover" type="button" disabled={savingFormFields} onClick={() => void confirmDeleteField(field)}><TrashIcon /></button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                {editingFieldId !== field.id ? (
                  <div className="popapply-row-actions">
                    <button className="popapply-btn popapply-btn--icon popapply-btn--ghost" type="button" disabled={index === 0 || savingFormFields} onClick={() => void moveField(index, -1)}>↑</button>
                    <button className="popapply-btn popapply-btn--icon popapply-btn--ghost" type="button" disabled={index === fields.length - 1 || savingFormFields} onClick={() => void moveField(index, 1)}>↓</button>
                    <button className="popapply-btn popapply-btn--icon popapply-btn--ghost" type="button" disabled={savingFormFields} onClick={() => startEditField(field)}><SettingsIcon /></button>
                    <button className="popapply-btn popapply-btn--icon popapply-btn--ghost popapply-btn--danger-hover" type="button" disabled={savingFormFields} onClick={() => void confirmDeleteField(field)}><TrashIcon /></button>
                  </div>
                ) : null}
              </div>
            ))}
            <p className="popapply-info popapply-autosave">{savingFormFields ? "Saving field changes..." : "Field changes save automatically."}</p>
          </div>
        </section>
      )}
    </div>
  );
}
