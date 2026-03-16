// File: frontend/src/dashboard/pages/admin/CohortsPage.tsx
// Purpose: Renders the admin cohorts page page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AnnouncementPromptModal } from "../../components/AnnouncementPromptModal";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { PulseDots } from "../../components/PulseDots";
import { StatsCard } from "../../components/StatsCard";
import { Table } from "../../components/Table";
import { ToastStack } from "../../components/ToastStack";
import { useDashboardToasts } from "../../hooks/useDashboardToasts";
import { buildCohortAnnouncementDefaults, type AnnouncementPromptDefaults } from "../../lib/announcementPrompts";
import { ApiError, api, apiList } from "../../utils/api";
import { formatDate, formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";

type CohortStatus = "coming_soon" | "open" | "running" | "completed" | "cancelled";
type SortBy = "updated_at" | "created_at" | "name" | "start_date" | "status";
type AttendanceDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const DEFAULT_ATTENDANCE_DAYS: AttendanceDay[] = ["monday", "tuesday", "wednesday", "thursday"];
const ATTENDANCE_DAY_OPTIONS: Array<{ value: AttendanceDay; label: string }> = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

type CohortRow = {
  id: number;
  program_id: number;
  program_title: string;
  name: string;
  status: CohortStatus;
  capacity: number | null;
  enrollment_open_at: string | null;
  enrollment_close_at: string | null;
  start_date: string | null;
  end_date: string | null;
  attendance_days?: string[] | null;
  attendance_start_time?: string | null;
  attendance_end_time?: string | null;
  use_general_form?: boolean;
  application_form_id?: number | null;
  created_at: string;
  updated_at: string;
};

type ProgramOption = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  default_capacity: number | null;
};

type InstructorOption = {
  user_id: number;
  full_name: string;
  expertise: string | null;
  is_active: boolean;
};

type CohortInstructorRow = {
  cohort_id: number;
  instructor_user_id: number;
  cohort_role: string;
  full_name: string;
};

type CohortFormState = {
  programId: string;
  name: string;
  capacity: string;
  enrollmentOpenAt: string;
  enrollmentCloseAt: string;
  startDate: string;
  endDate: string;
  attendanceDays: AttendanceDay[];
  attendanceStartTime: string;
  attendanceEndTime: string;
};

type ProgramInlineFormState = {
  title: string;
  slug: string;
  summary: string;
  defaultCapacity: string;
};

type CohortSavePayload = {
  program_id: number;
  name: string;
  capacity: number | null;
  enrollment_open_at: string | null;
  enrollment_close_at: string | null;
  start_date: string | null;
  end_date: string | null;
  attendance_days: AttendanceDay[];
  attendance_start_time: string | null;
  attendance_end_time: string | null;
};

type EnrolledStudent = {
  student_user_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  enrollment_status: string;
};

type DetailTab = "info" | "students";

type OpenFormPrompt = {
  cohortId: number;
  cohortName: string;
};

type AnnouncementPromptState = {
  summary: string;
  defaults: AnnouncementPromptDefaults;
  cohortId: number | null;
  nextOpenFormPrompt: OpenFormPrompt | null;
};

type FormMode = "create" | "edit" | null;

const NEW_PROGRAM_VALUE = "__new_program__";

const initialCohortForm: CohortFormState = {
  programId: "",
  name: "",
  capacity: "",
  enrollmentOpenAt: "",
  enrollmentCloseAt: "",
  startDate: "",
  endDate: "",
  attendanceDays: DEFAULT_ATTENDANCE_DAYS,
  attendanceStartTime: "",
  attendanceEndTime: "",
};

const initialInlineProgramForm: ProgramInlineFormState = {
  title: "",
  slug: "",
  summary: "",
  defaultCapacity: "",
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalized;
}

function normalizeAttendanceDays(days: string[] | null | undefined): AttendanceDay[] {
  if (!Array.isArray(days) || !days.length) {
    return [...DEFAULT_ATTENDANCE_DAYS];
  }
  const normalized = days
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter((entry): entry is AttendanceDay =>
      ATTENDANCE_DAY_OPTIONS.some((option) => option.value === entry),
    );
  return normalized.length ? [...new Set(normalized)] as AttendanceDay[] : [...DEFAULT_ATTENDANCE_DAYS];
}

function toTimeInputValue(value: string | null | undefined): string {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^([01]\d|2[0-3]):[0-5]\d/);
  return match ? match[0] : "";
}

function toDateTimeInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toCohortFormState(cohort: CohortRow | null): CohortFormState {
  if (!cohort) {
    return initialCohortForm;
  }

  return {
    programId: String(cohort.program_id),
    name: cohort.name,
    capacity: cohort.capacity === null ? "" : String(cohort.capacity),
    enrollmentOpenAt: toDateTimeInputValue(cohort.enrollment_open_at),
    enrollmentCloseAt: toDateTimeInputValue(cohort.enrollment_close_at),
    startDate: toDateInputValue(cohort.start_date),
    endDate: toDateInputValue(cohort.end_date),
    attendanceDays: normalizeAttendanceDays(cohort.attendance_days),
    attendanceStartTime: toTimeInputValue(cohort.attendance_start_time),
    attendanceEndTime: toTimeInputValue(cohort.attendance_end_time),
  };
}

function parseCapacity(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Capacity must be a whole number greater than or equal to 0.");
  }

  return parsed;
}

function parseProgramCapacity(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Program default capacity must be a whole number greater than or equal to 0.");
  }

  return parsed;
}

export function CohortsPage() {
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();
  const navigate = useNavigate();
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [instructorOptions, setInstructorOptions] = useState<InstructorOption[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [filterSheetOffset, setFilterSheetOffset] = useState(0);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<CohortRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("info");
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<CohortRow | null>(null);
  const [form, setForm] = useState<CohortFormState>(initialCohortForm);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<number[]>([]);
  const [initialInstructorIds, setInitialInstructorIds] = useState<number[]>([]);
  const [loadingAssignedInstructors, setLoadingAssignedInstructors] = useState(false);
  const [inlineProgramForm, setInlineProgramForm] = useState<ProgramInlineFormState>(initialInlineProgramForm);
  const [isInlineProgramOpen, setIsInlineProgramOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CohortRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openFormPrompt, setOpenFormPrompt] = useState<OpenFormPrompt | null>(null);
  const [announcementPrompt, setAnnouncementPrompt] = useState<AnnouncementPromptState | null>(null);
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);
  const [isAssigningGeneralForm, setIsAssigningGeneralForm] = useState(false);
  const [isPreparingCustomForm, setIsPreparingCustomForm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const filterDragStartYRef = useRef<number | null>(null);
  const filterOffsetRef = useRef(0);

  const closeDetailModal = () => {
    setSelected(null);
    setDetailTab("info");
    setEnrolledStudents([]);
    setLoadingEnrollments(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    if (!selected || detailTab !== "students") return;
    let active = true;
    setLoadingEnrollments(true);
    api<{ students: EnrolledStudent[]; total: number }>(`/cohorts/${selected.id}/enrollments`)
      .then((res) => {
        if (!active) return;
        setEnrolledStudents(res.students);
      })
      .catch((err) => {
        if (!active) return;
        pushToast("error", err instanceof ApiError ? err.message : "Failed to load enrolled students.");
      })
      .finally(() => {
        if (active) setLoadingEnrollments(false);
      });
    return () => {
      active = false;
    };
  }, [selected, detailTab]);

  useEffect(() => {
    let active = true;

    const loadPrograms = async () => {
      try {
        const result = await apiList<ProgramOption>(
          `/programs${buildQueryString({
            limit: 100,
            sortBy: "title",
            order: "asc",
          })}`,
        );

        if (!active) {
          return;
        }

        setPrograms(result.data);
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message || "Failed to load programs.");
        } else {
          setError("Failed to load programs.");
        }
      }
    };

    void loadPrograms();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadInstructors = async () => {
      try {
        const result = await apiList<InstructorOption>(
          `/profiles/instructors${buildQueryString({
            page: 1,
            limit: 200,
            sortBy: "full_name",
            order: "asc",
          })}`,
        );

        if (!active) {
          return;
        }

        setInstructorOptions(
          result.data
            .filter((row) => row.is_active !== false)
            .map((row) => ({
              user_id: row.user_id,
              full_name: row.full_name,
              expertise: row.expertise ?? null,
              is_active: row.is_active,
            })),
        );
      } catch {
        if (!active) {
          return;
        }
        setInstructorOptions([]);
      }
    };

    void loadInstructors();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadCohorts = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await apiList<CohortRow>(
          `/cohorts${buildQueryString({
            search: debouncedSearch || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            limit: 100,
            sortBy,
            order: sortOrder,
          })}`,
        );

        if (!active) {
          return;
        }

        setCohorts(result.data);
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message || "Failed to load cohorts.");
        } else {
          setError("Failed to load cohorts.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCohorts();

    return () => {
      active = false;
    };
  }, [debouncedSearch, statusFilter, refreshKey, sortBy, sortOrder]);

  const rows = useMemo(
    () =>
      cohorts.filter((row) => {
        if (programFilter !== "all" && String(row.program_id) !== programFilter) {
          return false;
        }

        return true;
      }),
    [cohorts, programFilter],
  );

  const totalCohorts = rows.length;
  const openCount = rows.filter((row) => row.status === "open").length;
  const lastUpdated = rows[0]?.updated_at ?? "";

  useEffect(() => {
    if (success) {
      pushToast("success", success);
    }
  }, [pushToast, success]);

  useEffect(() => {
    if (error) {
      pushToast("error", error);
    }
  }, [error, pushToast]);
  const formTitle = formMode === "create" ? "Add Cohort" : "Edit Cohort";

  const getProgramMeta = (programId: number) => {
    const match = programs.find((program) => program.id === programId) ?? null;
    return {
      title: match?.title || "this program",
      slug: match?.slug || null,
    };
  };

  const releaseAnnouncementFollowUp = () => {
    const nextPrompt = announcementPrompt?.nextOpenFormPrompt ?? null;
    setAnnouncementPrompt(null);
    if (nextPrompt) {
      setOpenFormPrompt(nextPrompt);
    }
  };

  const openAnnouncementPrompt = (config: AnnouncementPromptState) => {
    setAnnouncementPrompt(config);
  };

  const closeMobileFilters = () => {
    setShowFiltersMobile(false);
    setIsFilterDragging(false);
    setFilterSheetOffset(0);
    filterOffsetRef.current = 0;
    filterDragStartYRef.current = null;
  };

  const openMobileFilters = () => {
    setShowFiltersMobile(true);
    setFilterSheetOffset(0);
    filterOffsetRef.current = 0;
  };

  const handleFilterDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    filterDragStartYRef.current = event.clientY;
    setIsFilterDragging(true);
  };

  useEffect(() => {
    if (!isFilterDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (filterDragStartYRef.current === null) {
        return;
      }

      const delta = Math.max(0, event.clientY - filterDragStartYRef.current);
      filterOffsetRef.current = delta;
      setFilterSheetOffset(delta);
    };

    const handlePointerUp = () => {
      const shouldClose = filterOffsetRef.current > 130;
      setIsFilterDragging(false);
      filterDragStartYRef.current = null;

      if (shouldClose) {
        closeMobileFilters();
        return;
      }

      filterOffsetRef.current = 0;
      setFilterSheetOffset(0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isFilterDragging]);

  useEffect(() => {
    if (!showFiltersMobile) {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = () => {
      if (mediaQuery.matches) {
        closeMobileFilters();
      }
    };

    closeOnDesktop();
    mediaQuery.addEventListener("change", closeOnDesktop);

    return () => {
      mediaQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [showFiltersMobile]);

  useEffect(() => {
    if (!success && !error) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccess("");
      setError("");
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [success, error]);

  useEffect(() => {
    let active = true;

    const loadAssignedInstructors = async () => {
      if (formMode !== "edit" || !editing) {
        setInitialInstructorIds([]);
        setSelectedInstructorIds([]);
        setLoadingAssignedInstructors(false);
        return;
      }

      setLoadingAssignedInstructors(true);
      try {
        const result = await apiList<CohortInstructorRow>(
          `/cohorts/${editing.id}/instructors${buildQueryString({
            page: 1,
            limit: 200,
            sortBy: "full_name",
            order: "asc",
          })}`,
        );

        if (!active) {
          return;
        }

        const ids = result.data
          .map((row) => Number(row.instructor_user_id))
          .filter((value) => Number.isInteger(value) && value > 0);

        setInitialInstructorIds(ids);
        setSelectedInstructorIds(ids);
      } catch {
        if (!active) {
          return;
        }
        setInitialInstructorIds([]);
        setSelectedInstructorIds([]);
      } finally {
        if (active) {
          setLoadingAssignedInstructors(false);
        }
      }
    };

    void loadAssignedInstructors();

    return () => {
      active = false;
    };
  }, [formMode, editing]);

  const openCreate = () => {
    const firstProgramId = programs[0]?.id ? String(programs[0].id) : "";
    setFormMode("create");
    setEditing(null);
    setForm({
      ...initialCohortForm,
      programId: firstProgramId,
    });
    setInlineProgramForm(initialInlineProgramForm);
    setIsInlineProgramOpen(false);
    setInitialInstructorIds([]);
    setSelectedInstructorIds([]);
    setLoadingAssignedInstructors(false);
    setSuccess("");
  };

  const openEdit = (cohort: CohortRow) => {
    setFormMode("edit");
    setEditing(cohort);
    setForm(toCohortFormState(cohort));
    setLoadingAssignedInstructors(true);
    setInlineProgramForm(initialInlineProgramForm);
    setIsInlineProgramOpen(false);
    setSuccess("");
  };

  const closeForm = () => {
    if (isSubmitting) {
      return;
    }

    setFormMode(null);
    setEditing(null);
    setInlineProgramForm(initialInlineProgramForm);
    setIsInlineProgramOpen(false);
    setInitialInstructorIds([]);
    setSelectedInstructorIds([]);
    setLoadingAssignedInstructors(false);
  };

  const openInlineProgram = () => {
    setIsInlineProgramOpen(true);
    setForm((current) => ({ ...current, programId: NEW_PROGRAM_VALUE }));
    setInlineProgramForm(initialInlineProgramForm);
  };

  const createProgramInline = async (): Promise<ProgramOption> => {
    const title = inlineProgramForm.title.trim();
    const rawSlug = inlineProgramForm.slug.trim() || title;
    const slug = slugify(rawSlug);

    if (!title) {
      throw new Error("Program title is required when adding a new program.");
    }

    if (!slug) {
      throw new Error("Program slug is required when adding a new program.");
    }

    const defaultCapacity = parseProgramCapacity(inlineProgramForm.defaultCapacity);

    const payload: Record<string, unknown> = {
      slug,
      title,
      summary: inlineProgramForm.summary.trim(),
      is_published: true,
    };

    if (defaultCapacity !== undefined) {
      payload.default_capacity = defaultCapacity;
    }

    const created = await api<ProgramOption>("/programs", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setPrograms((current) => {
      const next = [...current, created];
      next.sort((a, b) => a.title.localeCompare(b.title));
      return next;
    });

    return created;
  };

  const buildSavePayload = async (): Promise<CohortSavePayload | null> => {
    const cohortName = form.name.trim();
    if (!cohortName) {
      pushToast("error", "Cohort name is required.");
      return null;
    }

    let programIdValue = form.programId;

    if (programIdValue === NEW_PROGRAM_VALUE || isInlineProgramOpen) {
      const createdProgram = await createProgramInline();
      programIdValue = String(createdProgram.id);
      setInlineProgramForm(initialInlineProgramForm);
      setIsInlineProgramOpen(false);
    }

    const programId = Number(programIdValue);
    if (!Number.isInteger(programId) || programId <= 0) {
      pushToast("error", "Program selection is required.");
      return null;
    }

    const capacity = parseCapacity(form.capacity);
    const enrollmentOpenAt = toIsoDateTime(form.enrollmentOpenAt);
    const enrollmentCloseAt = toIsoDateTime(form.enrollmentCloseAt);

    if (form.enrollmentOpenAt && !enrollmentOpenAt) {
      pushToast("error", "Enrollment open date/time is invalid.");
      return null;
    }

    if (form.enrollmentCloseAt && !enrollmentCloseAt) {
      pushToast("error", "Enrollment close date/time is invalid.");
      return null;
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      pushToast("error", "End date cannot be before start date.");
      return null;
    }

    const attendanceDays = form.attendanceDays.length ? form.attendanceDays : DEFAULT_ATTENDANCE_DAYS;
    const attendanceStartTime = form.attendanceStartTime.trim() || null;
    const attendanceEndTime = form.attendanceEndTime.trim() || null;

    if (attendanceStartTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(attendanceStartTime)) {
      pushToast("error", "Attendance start time must be in HH:MM format.");
      return null;
    }

    if (attendanceEndTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(attendanceEndTime)) {
      pushToast("error", "Attendance end time must be in HH:MM format.");
      return null;
    }

    if (attendanceStartTime && attendanceEndTime && attendanceEndTime <= attendanceStartTime) {
      pushToast("error", "Attendance end time must be after start time.");
      return null;
    }

    return {
      program_id: programId,
      name: cohortName,
      capacity,
      enrollment_open_at: enrollmentOpenAt,
      enrollment_close_at: enrollmentCloseAt,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      attendance_days: attendanceDays,
      attendance_start_time: attendanceStartTime,
      attendance_end_time: attendanceEndTime,
    };
  };

  const syncCohortInstructors = async (cohortId: number) => {
    const nextIds = Array.from(new Set(selectedInstructorIds.filter((value) => Number.isInteger(value) && value > 0)));
    const currentIds = Array.from(new Set(initialInstructorIds.filter((value) => Number.isInteger(value) && value > 0)));

    const toAssign = nextIds.filter((value) => !currentIds.includes(value));
    const toRemove = currentIds.filter((value) => !nextIds.includes(value));

    if (!toAssign.length && !toRemove.length) {
      return;
    }

    await Promise.all([
      ...toAssign.map((instructorUserId) =>
        api(`/cohorts/${cohortId}/instructors`, {
          method: "POST",
          body: JSON.stringify({
            instructor_user_id: instructorUserId,
            cohort_role: "instructor",
          }),
        }),
      ),
      ...toRemove.map((instructorUserId) =>
        api(`/cohorts/${cohortId}/instructors/${instructorUserId}`, {
          method: "DELETE",
        }),
      ),
    ]);
  };

  const persistCohort = async (payload: CohortSavePayload) => {
    setIsSubmitting(true);
    setError("");

    try {
      const requestBody: Record<string, unknown> = { ...payload };

      let saved: CohortRow;
      if (formMode === "create") {
        saved = await api<CohortRow>("/cohorts", {
          method: "POST",
          body: JSON.stringify(requestBody),
        });
      } else if (formMode === "edit" && editing) {
        saved = await api<CohortRow>(`/cohorts/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        });
      } else {
        return;
      }

      try {
        await syncCohortInstructors(saved.id);
      } catch (syncError) {
        if (syncError instanceof ApiError) {
          setError(syncError.message || "Cohort was saved, but instructor assignments failed.");
        } else {
          setError("Cohort was saved, but instructor assignments failed.");
        }
      }

      setSuccess(formMode === "create" ? "Cohort added successfully." : "Cohort updated successfully.");
      setInitialInstructorIds([...selectedInstructorIds]);

      setFormMode(null);
      setEditing(null);
      setLoadingAssignedInstructors(false);
      setRefreshKey((current) => current + 1);

      const isCreateFlow = formMode === "create";
      const wasOpenBefore = formMode === "edit" && editing?.status === "open";
      const nextOpenFormPrompt = isCreateFlow || (saved.status === "open" && !wasOpenBefore)
        ? {
          cohortId: saved.id,
          cohortName: saved.name,
        }
        : null;

      const { title: programName, slug: programSlug } = getProgramMeta(saved.program_id);
      const previousStatus = editing?.status ?? null;
      let defaults: AnnouncementPromptDefaults | null = null;
      if (isCreateFlow) {
        defaults = buildCohortAnnouncementDefaults({
          mode:
            saved.status === "open"
              ? "open"
              : saved.status === "running"
                ? "running"
                : saved.status === "completed"
                  ? "completed"
                  : saved.status === "cancelled"
                    ? "deleted"
                    : "coming_soon",
          cohortName: saved.name,
          programName,
          programSlug,
          cohortId: saved.id,
        });
      } else if (previousStatus && previousStatus !== saved.status) {
        defaults = buildCohortAnnouncementDefaults({
          mode:
            saved.status === "open"
              ? "open"
              : saved.status === "running"
                ? "running"
                : saved.status === "completed"
                  ? "completed"
                  : saved.status === "cancelled"
                    ? "deleted"
                    : previousStatus === "open" && saved.status === "coming_soon"
                      ? "closed"
                      : "coming_soon",
          cohortName: saved.name,
          programName,
          programSlug,
          cohortId: saved.id,
        });
      }

      if (defaults) {
        openAnnouncementPrompt({
          summary: `${saved.name} has been ${isCreateFlow ? "created" : "updated"}. Would you like to publish an announcement?`,
          defaults,
          cohortId: saved.id,
          nextOpenFormPrompt,
        });
      } else if (nextOpenFormPrompt) {
        setOpenFormPrompt(nextOpenFormPrompt);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        pushToast("error", err.message || "Failed to save cohort.");
      } else if (err instanceof Error) {
        pushToast("error", err.message || "Failed to save cohort.");
      } else {
        pushToast("error", "Failed to save cohort.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyStatusChange = async (row: CohortRow, nextStatus: CohortStatus) => {
    setStatusUpdatingId(row.id);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, unknown> = { status: nextStatus };

      const updated = await api<CohortRow>(`/cohorts/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      setSuccess("Cohort status updated successfully.");
      setRefreshKey((current) => current + 1);

      if (updated.status === "open" && row.status !== "open") {
        const { title: programName, slug: programSlug } = getProgramMeta(updated.program_id);
        openAnnouncementPrompt({
          summary: `${updated.name} status was updated. Would you like to publish an announcement?`,
          defaults: buildCohortAnnouncementDefaults({
            mode: "open",
            cohortName: updated.name,
            programName,
            programSlug,
            cohortId: updated.id,
          }),
          cohortId: updated.id,
          nextOpenFormPrompt: {
            cohortId: updated.id,
            cohortName: updated.name,
          },
        });
      } else if (updated.status !== row.status) {
        const { title: programName, slug: programSlug } = getProgramMeta(updated.program_id);
        openAnnouncementPrompt({
          summary: `${updated.name} status was updated. Would you like to publish an announcement?`,
          defaults: buildCohortAnnouncementDefaults({
            mode:
              updated.status === "running"
                ? "running"
                : updated.status === "completed"
                  ? "completed"
                  : updated.status === "cancelled"
                    ? "deleted"
                    : row.status === "open" && updated.status === "coming_soon"
                      ? "closed"
                      : "coming_soon",
            cohortName: updated.name,
            programName,
            programSlug,
            cohortId: updated.id,
          }),
          cohortId: updated.id,
          nextOpenFormPrompt: null,
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to update cohort status.");
      } else {
        setError("Failed to update cohort status.");
      }
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const requestStatusChange = (row: CohortRow, nextStatus: CohortStatus) => {
    if (row.status === nextStatus) {
      return;
    }

    void applyStatusChange(row, nextStatus);
  };

  const handleSave = async () => {
    setError("");

    try {
      const payload = await buildSavePayload();
      if (!payload) {
        return;
      }

      await persistCohort(payload);
    } catch (err) {
      if (err instanceof Error) {
        pushToast("error", err.message || "Failed to save cohort.");
      } else {
        pushToast("error", "Failed to save cohort.");
      }
    }
  };

  const handleAnnouncementConfirm = async (payload: {
    title: string;
    body: string;
    cta_label: string | null;
    cta_url: string | null;
    is_published: boolean;
    publish_at: string | null;
    target_audience: "all" | "website" | "admin";
  }) => {
    if (!announcementPrompt) {
      return;
    }

    setIsPublishingAnnouncement(true);
    try {
      await api("/announcements", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          cohort_id: announcementPrompt.cohortId,
        }),
      });
      setSuccess("Announcement published successfully.");
      releaseAnnouncementFollowUp();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to publish announcement.");
      } else {
        setError("Failed to publish announcement.");
      }
    } finally {
      setIsPublishingAnnouncement(false);
    }
  };

  const applyGeneralFormToOpenCohort = async () => {
    if (!openFormPrompt) {
      return;
    }

    setIsAssigningGeneralForm(true);

    try {
      await api(`/cohorts/${openFormPrompt.cohortId}/form/assign`, {
        method: "POST",
        body: JSON.stringify({
          mode: "general",
        }),
      });
      setSuccess("General form assigned to cohort.");
      setOpenFormPrompt(null);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "VALIDATION_ERROR" && err.message.toLowerCase().includes("invalid request data")) {
          setError("Forms actions need the latest backend version. Restart the server and try again.");
        } else {
          setError(err.message || "Failed to assign general form.");
        }
      } else {
        setError("Failed to assign general form.");
      }
    } finally {
      setIsAssigningGeneralForm(false);
    }
  };

  const goToCustomizeForm = async () => {
    if (!openFormPrompt) {
      return;
    }

    const cohortId = openFormPrompt.cohortId;
    setIsPreparingCustomForm(true);

    try {
      await api(`/cohorts/${cohortId}/form/assign`, {
        method: "POST",
        body: JSON.stringify({ mode: "custom" }),
      });
      setOpenFormPrompt(null);
      setSuccess("Custom cohort form prepared.");
      navigate(`/admin/forms?cohort_id=${cohortId}&mode=custom`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && err.code === "NOT_FOUND") {
        setError("Forms API is unavailable on the current backend process. Restart the server and try again.");
      } else if (err instanceof ApiError) {
        setError(err.message || "Failed to open form customization.");
      } else {
        setError("Failed to open form customization.");
      }
    } finally {
      setIsPreparingCustomForm(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const cohortToDelete = deleteTarget;
      await api<{ id: number }>(`/cohorts/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setSuccess("Cohort deleted successfully.");
      setDeleteTarget(null);
      setRefreshKey((current) => current + 1);
      const { title: programName, slug: programSlug } = getProgramMeta(cohortToDelete.program_id);
      openAnnouncementPrompt({
        summary: `${cohortToDelete.name} has been deleted. Would you like to publish an announcement?`,
        defaults: buildCohortAnnouncementDefaults({
          mode: "deleted",
          cohortName: cohortToDelete.name,
          programName,
          programSlug,
          cohortId: cohortToDelete.id,
        }),
        cohortId: null,
        nextOpenFormPrompt: null,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to delete cohort.");
      } else {
        setError("Failed to delete cohort.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageShell
      title="Cohorts"
      subtitle="Manage cohorts and link them directly to programs from database."
      actions={
        <button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={openCreate}>
          Add Cohort
        </button>
      }
    >
      <div className="dh-page">
        <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />

        <div className="stats-grid stats-grid--compact dh-stats">
          <StatsCard label="Total Cohorts" value={String(totalCohorts)} hint="Rows after current filters" />
          <StatsCard label="Open Cohorts" value={String(openCount)} hint="Accepting applications" />
          <StatsCard
            label="Last Updated"
            value={lastUpdated ? formatDateTime(lastUpdated) : "No records"}
            hint="Most recently changed"
          />
        </div>

        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar
              className="dh-form-grid dh-form-grid--cohorts"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search cohort or program"
              selects={[
                {
                  label: "Status",
                  value: statusFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Coming Soon", value: "coming_soon" },
                    { label: "Open", value: "open" },
                    { label: "Running", value: "running" },
                    { label: "Completed", value: "completed" },
                    { label: "Cancelled", value: "cancelled" },
                  ],
                  onChange: setStatusFilter,
                },
                {
                  label: "Program",
                  value: programFilter,
                  options: [
                    { label: "All Programs", value: "all" },
                    ...programs.map((programOption) => ({
                      label: programOption.title,
                      value: String(programOption.id),
                    })),
                  ],
                  onChange: setProgramFilter,
                },
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Last Updated", value: "updated_at" },
                    { label: "Created Date", value: "created_at" },
                    { label: "Start Date", value: "start_date" },
                    { label: "Name", value: "name" },
                    { label: "Status", value: "status" },
                  ],
                  onChange: (value) => setSortBy(value as SortBy),
                },
                {
                  label: "Sort Order",
                  value: sortOrder,
                  options: [
                    { label: "Descending", value: "desc" },
                    { label: "Ascending", value: "asc" },
                  ],
                  onChange: (value) => setSortOrder(value as "asc" | "desc"),
                },
              ]}
            />
          </div>
          <div className="dh-filters-mobile-bar">
            <button
              className={`btn btn--secondary dh-btn dh-filters-toggle ${showFiltersMobile ? "dh-filters-toggle--active" : ""}`}
              type="button"
              onClick={openMobileFilters}
              aria-expanded={showFiltersMobile}
              aria-controls="cohort-filters-mobile-panel"
            >
              <span className="dh-filters-toggle__label">Filter</span>
            </button>
          </div>
        </div>

        {loading ? (
          <Card><PulseDots padding={40} label="Loading data" /></Card>
        ) : null}

        {!loading ? (
          <Card className="card--table desktop-only dh-table-wrap">
            <Table<CohortRow>
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage="No cohorts found."
              columns={[
                {
                  key: "name",
                  label: "Cohort",
                  className: "table-cell-strong",
                  render: (row) => (
                    <button className="program-title-btn" type="button" onClick={() => setSelected(row)}>
                      {row.name}
                    </button>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => (
                    <div className="cohort-status-cell">
                      <select
                        className={`field__control cohort-status-cell__select cohort-status-cell__select--${row.status}`}
                        value={row.status}
                        disabled={statusUpdatingId === row.id}
                        onChange={(event) => requestStatusChange(row, event.target.value as CohortStatus)}
                      >
                        <option value="coming_soon">Coming Soon</option>
                        <option value="open">Open</option>
                        <option value="running">Running</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  ),
                },
                {
                  key: "capacity",
                  label: "Capacity",
                  render: (row) => row.capacity ?? "N/A",
                },
                {
                  key: "start_date",
                  label: "Start Date",
                  render: (row) => (row.start_date ? formatDate(row.start_date) : "N/A"),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="table-actions dh-table-actions">
                      <button
                        className="btn btn--secondary btn--sm dh-btn"
                        type="button"
                        onClick={() => navigate(`/admin/forms?cohort_id=${row.id}`)}
                      >
                        Form
                      </button>
                      <button className="btn btn--secondary btn--sm dh-btn btn--edit" type="button" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                      <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>
                        Delete
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        ) : null}

        {!loading ? (
          <div className="mobile-only programs-mobile-list">
            {rows.length ? (
              rows.map((row) => (
                <article className="program-mobile-item" key={row.id}>
                  <button className="program-mobile-item__title" type="button" onClick={() => setSelected(row)}>
                    {row.name}
                  </button>
                  <p className="info-text">
                    Program: <span className="text-strong">{row.program_title}</span>
                  </p>
                  <div className="cohort-status-cell cohort-status-cell--mobile">
                    <select
                      className={`field__control cohort-status-cell__select cohort-status-cell__select--${row.status}`}
                      value={row.status}
                      disabled={statusUpdatingId === row.id}
                      onChange={(event) => requestStatusChange(row, event.target.value as CohortStatus)}
                    >
                      <option value="coming_soon">Coming Soon</option>
                      <option value="open">Open</option>
                      <option value="running">Running</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="table-actions program-mobile-item__actions">
                    <button
                      className="btn btn--secondary btn--sm dh-btn"
                      type="button"
                      onClick={() => navigate(`/admin/forms?cohort_id=${row.id}`)}
                    >
                      Form
                    </button>
                    <button className="btn btn--secondary btn--sm dh-btn btn--edit" type="button" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <Card>
                <div className="empty-state">
                  <p className="empty-state__title">No data</p>
                  <p className="empty-state__description">No cohorts found.</p>
                </div>
              </Card>
            )}
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="modal-overlay" role="presentation" onClick={closeDetailModal}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">{selected.name}</h3>
              <button
                className="modal-close"
                type="button"
                onClick={closeDetailModal}
                aria-label="Close modal"
              >
                ✕
              </button>
            </header>

            <div className="cohort-detail-tabs">
              <button
                type="button"
                className={`cohort-detail-tab${detailTab === "info" ? " cohort-detail-tab--active" : ""}`}
                onClick={() => setDetailTab("info")}
              >
                Info
              </button>
              <button
                type="button"
                className={`cohort-detail-tab${detailTab === "students" ? " cohort-detail-tab--active" : ""}`}
                onClick={() => setDetailTab("students")}
              >
                Students {enrolledStudents.length > 0 ? `(${enrolledStudents.length})` : ""}
              </button>
            </div>

            {detailTab === "info" ? (
              <div className="post-details">
                <p className="post-details__line"><strong>Program:</strong> {selected.program_title}</p>
                <p className="post-details__line"><strong>Status:</strong> {selected.status}</p>
                <p className="post-details__line"><strong>Capacity:</strong> {selected.capacity ?? "N/A"}</p>
                <p className="post-details__line">
                  <strong>Enrollment Open:</strong> {selected.enrollment_open_at ? formatDateTime(selected.enrollment_open_at) : "N/A"}
                </p>
                <p className="post-details__line">
                  <strong>Enrollment Close:</strong> {selected.enrollment_close_at ? formatDateTime(selected.enrollment_close_at) : "N/A"}
                </p>
                <p className="post-details__line">
                  <strong>Start Date:</strong> {selected.start_date ? formatDate(selected.start_date) : "N/A"}
                </p>
                <p className="post-details__line">
                  <strong>End Date:</strong> {selected.end_date ? formatDate(selected.end_date) : "N/A"}
                </p>
              </div>
            ) : null}

            {detailTab === "students" ? (
              <div className="cohort-roster">
                {loadingEnrollments ? (
                  <PulseDots padding={32} label="Loading enrolled students" />
                ) : enrolledStudents.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state__title">No enrolled students</p>
                    <p className="empty-state__description">
                      Students are enrolled when their application is accepted and a user account is created.
                    </p>
                  </div>
                ) : (
                  <div className="cohort-roster__list">
                    <div className="cohort-roster__header">
                      <span>#</span>
                      <span>Name</span>
                      <span>Email</span>
                      <span>Phone</span>
                      <span>Status</span>
                    </div>
                    {enrolledStudents.map((student, index) => (
                      <div key={student.student_user_id} className="cohort-roster__row">
                        <span className="cohort-roster__num">{index + 1}</span>
                        <span className="cohort-roster__name">{student.full_name}</span>
                        <span className="cohort-roster__email">{student.email ?? "—"}</span>
                        <span className="cohort-roster__phone">{student.phone ?? "—"}</span>
                        <span className={`cohort-roster__status cohort-roster__status--${student.enrollment_status}`}>
                          {student.enrollment_status}
                        </span>
                      </div>
                    ))}
                    <p className="cohort-roster__total">
                      {enrolledStudents.length} enrolled student{enrolledStudents.length !== 1 ? "s" : ""}
                      {selected.capacity ? ` · ${selected.capacity - enrolledStudents.length} seat${selected.capacity - enrolledStudents.length !== 1 ? "s" : ""} remaining` : ""}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                type="button"
                onClick={() => {
                  navigate(`/admin/forms?cohort_id=${selected.id}`);
                  closeDetailModal();
                }}
              >
                Application Form
              </button>
              <button
                className="btn btn--secondary"
                type="button"
                onClick={() => {
                  openEdit(selected);
                  closeDetailModal();
                }}
              >
                Edit
              </button>
              <button
                className="btn btn--danger"
                type="button"
                onClick={() => {
                  setDeleteTarget(selected);
                  closeDetailModal();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {formMode ? (
        <div className="modal-overlay" role="presentation" onClick={closeForm}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">{formTitle}</h3>
            </header>

            <div className="form-stack">
              <label className="field">
                <span className="field__label">Program</span>
                <select
                  className="field__control"
                  value={form.programId}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((current) => ({ ...current, programId: nextValue }));
                    if (nextValue === NEW_PROGRAM_VALUE) {
                      setIsInlineProgramOpen(true);
                    } else {
                      setIsInlineProgramOpen(false);
                    }
                  }}
                >
                  <option value="">Select program</option>
                  {programs.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                  <option value={NEW_PROGRAM_VALUE}>+ Add new program here</option>
                </select>
              </label>

              {!isInlineProgramOpen ? (
                <button className="btn btn--secondary btn--sm cohort-inline-program__toggle" type="button" onClick={openInlineProgram}>
                  Add New Program
                </button>
              ) : null}

              {isInlineProgramOpen ? (
                <div className="cohort-inline-program">
                  <p className="cohort-inline-program__title">New Program</p>
                  <div className="cohort-inline-program__grid">
                    <label className="field">
                      <span className="field__label">Program Title</span>
                      <input
                        className="field__control"
                        type="text"
                        value={inlineProgramForm.title}
                        onChange={(event) =>
                          setInlineProgramForm((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="field__label">Program Slug</span>
                      <input
                        className="field__control"
                        type="text"
                        value={inlineProgramForm.slug}
                        onChange={(event) =>
                          setInlineProgramForm((current) => ({ ...current, slug: event.target.value }))
                        }
                        placeholder="Auto-generated if empty"
                      />
                    </label>
                    <label className="field cohort-inline-program__field-wide">
                      <span className="field__label">Program Summary</span>
                      <textarea
                        className="textarea-control"
                        value={inlineProgramForm.summary}
                        onChange={(event) =>
                          setInlineProgramForm((current) => ({ ...current, summary: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="field__label">Program Default Capacity</span>
                      <input
                        className="field__control"
                        type="number"
                        min={0}
                        step={1}
                        value={inlineProgramForm.defaultCapacity}
                        onChange={(event) =>
                          setInlineProgramForm((current) => ({ ...current, defaultCapacity: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <label className="field">
                <span className="field__label">Cohort Name</span>
                <input
                  className="field__control"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <div className="cohort-form-grid">
                <label className="field">
                  <span className="field__label">Capacity</span>
                  <input
                    className="field__control"
                    type="number"
                    min={0}
                    step={1}
                    value={form.capacity}
                    onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                  />
                </label>
              </div>

              <div className="cohort-form-grid">
                <label className="field">
                  <span className="field__label">Enrollment Opens</span>
                  <input
                    className="field__control"
                    type="datetime-local"
                    value={form.enrollmentOpenAt}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, enrollmentOpenAt: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span className="field__label">Enrollment Closes</span>
                  <input
                    className="field__control"
                    type="datetime-local"
                    value={form.enrollmentCloseAt}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, enrollmentCloseAt: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span className="field__label">Start Date</span>
                  <input
                    className="field__control"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </label>

                <label className="field">
                  <span className="field__label">End Date</span>
                  <input
                    className="field__control"
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  />
                </label>
              </div>

              <div className="cohort-form-grid">
                <label className="field cohort-attendance-days">
                  <span className="field__label">Attendance Days</span>
                  <div className="cohort-attendance-days__options">
                    {ATTENDANCE_DAY_OPTIONS.map((option) => {
                      const checked = form.attendanceDays.includes(option.value);
                      return (
                        <label key={option.value} className="cohort-attendance-days__option">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setForm((current) => {
                                const currentDays = current.attendanceDays;
                                const nextDays = event.target.checked
                                  ? [...currentDays, option.value]
                                  : currentDays.filter((entry) => entry !== option.value);
                                return {
                                  ...current,
                                  attendanceDays: nextDays.length ? nextDays : [...DEFAULT_ATTENDANCE_DAYS],
                                };
                              });
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </label>

                <label className="field">
                  <span className="field__label">Attendance Start</span>
                  <input
                    className="field__control"
                    type="time"
                    value={form.attendanceStartTime}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, attendanceStartTime: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span className="field__label">Attendance End</span>
                  <input
                    className="field__control"
                    type="time"
                    value={form.attendanceEndTime}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, attendanceEndTime: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="cohort-form-grid">
                <label className="field cohort-attendance-days">
                  <span className="field__label">Assigned Instructors</span>
                  {loadingAssignedInstructors ? (
                    <PulseDots layout="inline" label="Loading instructors" />
                  ) : null}
                  {!loadingAssignedInstructors && !instructorOptions.length ? (
                    <p className="info-text info-text--small">No active instructors found.</p>
                  ) : null}
                  {!loadingAssignedInstructors && instructorOptions.length ? (
                    <div className="cohort-attendance-days__options cohort-attendance-days__options--instructors">
                      {instructorOptions.map((instructor) => {
                        const checked = selectedInstructorIds.includes(instructor.user_id);
                        return (
                          <label key={instructor.user_id} className="cohort-attendance-days__option">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                setSelectedInstructorIds((current) => {
                                  if (event.target.checked) {
                                    return Array.from(new Set([...current, instructor.user_id]));
                                  }
                                  return current.filter((value) => value !== instructor.user_id);
                                });
                              }}
                            />
                            <span>{instructor.full_name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </label>
              </div>

              <p className="dh-field-help">
                Status is calculated automatically from dates by default. You can update status directly from the list.
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closeForm} disabled={isSubmitting}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AnnouncementPromptModal
        open={Boolean(announcementPrompt)}
        defaultTitle={announcementPrompt?.defaults.title || ""}
        defaultBody={announcementPrompt?.defaults.body || ""}
        defaultCtaLabel={announcementPrompt?.defaults.ctaLabel || ""}
        defaultCtaUrl={announcementPrompt?.defaults.ctaUrl || ""}
        defaultTargetAudience={announcementPrompt?.defaults.targetAudience || "website"}
        summary={announcementPrompt?.summary || ""}
        saving={isPublishingAnnouncement}
        onConfirm={handleAnnouncementConfirm}
        onSkip={releaseAnnouncementFollowUp}
      />

      {openFormPrompt ? (
        <div className="modal-overlay" role="presentation">
          <div
            className="modal-card modal-card--narrow"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h3 className="modal-title">Application Form Setup</h3>
            </header>
            <p className="post-details__line">
              Choose the application form mode for <strong>{openFormPrompt.cohortName}</strong>.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                type="button"
                onClick={applyGeneralFormToOpenCohort}
                disabled={isAssigningGeneralForm || isPreparingCustomForm}
              >
                {isAssigningGeneralForm ? "Saving..." : "Use General Form"}
              </button>
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => {
                  void goToCustomizeForm();
                }}
                disabled={isAssigningGeneralForm || isPreparingCustomForm}
              >
                {isPreparingCustomForm ? "Preparing..." : "Customize Form"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-card modal-card--narrow"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h3 className="modal-title">Delete Cohort</h3>
            </header>

            <p className="post-details__line">
              Delete <strong>{deleteTarget.name}</strong>? This will soft-delete the cohort.
            </p>

            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button className="btn btn--danger" type="button" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFiltersMobile ? (
        <div className="dh-filter-modal" role="presentation" onClick={closeMobileFilters}>
          <div
            id="cohort-filters-mobile-panel"
            className={`dh-filter-sheet ${isFilterDragging ? "dh-filter-sheet--dragging" : ""}`}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ transform: `translateY(${filterSheetOffset}px)` }}
          >
            <div className="dh-filter-sheet__drag" onPointerDown={handleFilterDragStart}>
              <span className="dh-filter-sheet__grabber" aria-hidden />
              <p className="dh-filter-sheet__title">Filters</p>
            </div>
            <FilterBar
              className="dh-form-grid dh-form-grid--mobile"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search cohort or program"
              selects={[
                {
                  label: "Status",
                  value: statusFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Coming Soon", value: "coming_soon" },
                    { label: "Open", value: "open" },
                    { label: "Running", value: "running" },
                    { label: "Completed", value: "completed" },
                    { label: "Cancelled", value: "cancelled" },
                  ],
                  onChange: setStatusFilter,
                },
                {
                  label: "Program",
                  value: programFilter,
                  options: [
                    { label: "All Programs", value: "all" },
                    ...programs.map((programOption) => ({
                      label: programOption.title,
                      value: String(programOption.id),
                    })),
                  ],
                  onChange: setProgramFilter,
                },
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Last Updated", value: "updated_at" },
                    { label: "Created Date", value: "created_at" },
                    { label: "Start Date", value: "start_date" },
                    { label: "Name", value: "name" },
                    { label: "Status", value: "status" },
                  ],
                  onChange: (value) => setSortBy(value as SortBy),
                },
                {
                  label: "Sort Order",
                  value: sortOrder,
                  options: [
                    { label: "Descending", value: "desc" },
                    { label: "Ascending", value: "asc" },
                  ],
                  onChange: (value) => setSortOrder(value as "asc" | "desc"),
                },
              ]}
            />
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

