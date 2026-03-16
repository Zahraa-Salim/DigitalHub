import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { PageShell } from "../../components/PageShell";
import { ApiError, api, apiList } from "../../utils/api";
import {
  IMPORTABLE_TABLES,
  applyMapping,
  detectAutoMapping,
  parseCSV,
  type DbColumn,
  type ImportableTable,
} from "../../lib/csvImport";
import "../../styles/csv-import.css";

// ── Export tab ────────────────────────────────────────────────────────────────

type ExportColumn = {
  key: string;
  label: string;
  getValue: (row: Record<string, unknown>) => unknown;
  enabledByDefault?: boolean;
};

type ExportableSource = {
  key: string;
  label: string;
  group: string;
  endpoint: string;
  columns: ExportColumn[];
};

const EXPORTABLE_SOURCES: ExportableSource[] = [
  {
    key: "attendance",
    label: "Attendance",
    group: "Operations",
    endpoint: "",
    columns: [],
  },
  {
    key: "applications",
    label: "Applications",
    group: "Admissions",
    endpoint: "/applications?page=1&limit=1000&sortBy=submitted_at&order=desc",
    columns: [
      { key: "full_name", label: "Full Name", getValue: (r) => r.full_name ?? "" },
      { key: "email", label: "Email", getValue: (r) => r.email ?? "" },
      { key: "phone", label: "Phone", getValue: (r) => r.phone ?? "" },
      { key: "cohort_name", label: "Cohort", getValue: (r) => r.cohort_name ?? "" },
      { key: "stage", label: "Stage", getValue: (r) => r.stage ?? r.status ?? "" },
      { key: "submitted_at", label: "Submitted At", getValue: (r) => r.submitted_at ?? "" },
      { key: "reviewed_at", label: "Reviewed At", getValue: (r) => r.reviewed_at ?? "" },
    ],
  },
  {
    key: "program_applications",
    label: "Program Applications",
    group: "Admissions",
    endpoint: "/program-applications?page=1&limit=1000&sortBy=created_at&order=desc",
    columns: [
      { key: "full_name", label: "Full Name", getValue: (r) => r.full_name ?? "" },
      { key: "email", label: "Email", getValue: (r) => r.email ?? "" },
      { key: "phone", label: "Phone", getValue: (r) => r.phone ?? "" },
      { key: "stage", label: "Stage", getValue: (r) => r.stage ?? r.status ?? "" },
      { key: "created_at", label: "Created At", getValue: (r) => r.created_at ?? "" },
    ],
  },
  {
    key: "subscribers",
    label: "Subscribers",
    group: "Subscribers",
    endpoint: "/admin/subscribers?page=1&limit=5000&sortBy=created_at&order=desc",
    columns: [
      { key: "phone", label: "Phone", getValue: (r) => r.phone ?? "" },
      { key: "name", label: "Name", getValue: (r) => r.name ?? "" },
      { key: "preferences", label: "Preferences", getValue: (r) => Array.isArray(r.preferences) ? (r.preferences as string[]).join(", ") : "" },
      { key: "is_active", label: "Active", getValue: (r) => r.is_active ? "Yes" : "No" },
      { key: "source", label: "Source", getValue: (r) => r.source ?? "" },
      { key: "created_at", label: "Subscribed At", getValue: (r) => r.created_at ?? "" },
    ],
  },
  {
    key: "students",
    label: "Students",
    group: "People",
    endpoint: "/profiles/students?page=1&limit=2000&sortBy=created_at&order=desc",
    columns: [
      { key: "full_name", label: "Full Name", getValue: (r) => r.full_name ?? "" },
      { key: "email", label: "Email", getValue: (r) => r.email ?? "" },
      { key: "phone", label: "Phone", getValue: (r) => r.phone ?? "" },
      { key: "is_active", label: "Active", getValue: (r) => r.is_active ? "Yes" : "No" },
      { key: "created_at", label: "Created At", getValue: (r) => r.created_at ?? "" },
    ],
  },
  {
    key: "instructors",
    label: "Instructors",
    group: "People",
    endpoint: "/profiles/instructors?page=1&limit=500&sortBy=created_at&order=desc",
    columns: [
      { key: "full_name", label: "Full Name", getValue: (r) => r.full_name ?? "" },
      { key: "email", label: "Email", getValue: (r) => r.email ?? "" },
      { key: "expertise", label: "Expertise", getValue: (r) => r.expertise ?? "" },
      { key: "is_active", label: "Active", getValue: (r) => r.is_active ? "Yes" : "No" },
    ],
  },
  {
    key: "cohorts",
    label: "Cohorts",
    group: "Programs",
    endpoint: "/cohorts?page=1&limit=500&sortBy=created_at&order=desc",
    columns: [
      { key: "name", label: "Name", getValue: (r) => r.name ?? "" },
      { key: "program_title", label: "Program", getValue: (r) => r.program_title ?? "" },
      { key: "status", label: "Status", getValue: (r) => r.status ?? "" },
      { key: "start_date", label: "Start Date", getValue: (r) => r.start_date ?? "" },
      { key: "end_date", label: "End Date", getValue: (r) => r.end_date ?? "" },
      { key: "capacity", label: "Capacity", getValue: (r) => r.capacity ?? "" },
    ],
  },
];

function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildExportCsv(rows: Record<string, unknown>[], columns: ExportColumn[]): string {
  const header = columns.map((c) => toCsvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => toCsvCell(c.getValue(row))).join(","));
  return [header, ...lines].join("\r\n");
}

function downloadExportCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type AttendanceSheetForExport = {
  cohort: {
    id: number;
    name: string;
    program_title: string | null;
    start_date: string | null;
    end_date: string | null;
  };
  session: {
    id: number | null;
    attendance_date: string;
    location_type: string;
    submitted_at: string | null;
  };
  students: Array<{
    student_user_id: number;
    full_name: string;
    email: string | null;
    phone: string | null;
    attendance_status: string;
    note: string;
  }>;
};

function getDatesBetween(startIso: string | null, endIso: string | null): string[] {
  const start = startIso ? new Date(startIso) : null;
  const end = endIso ? new Date(endIso) : new Date();
  if (!start) return [];
  const today = new Date();
  const effectiveEnd = end > today ? today : end;
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= effectiveEnd) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function fetchAllAttendanceSessions(
  cohortId: number,
  startDate: string | null,
  endDate: string | null,
  apiFn: (path: string) => Promise<AttendanceSheetForExport>,
): Promise<Array<{ date: string; location: string; students: AttendanceSheetForExport["students"] }>> {
  const dates = getDatesBetween(startDate, endDate);
  const results: Array<{ date: string; location: string; students: AttendanceSheetForExport["students"] }> = [];

  const BATCH = 8;
  for (let i = 0; i < dates.length; i += BATCH) {
    const batch = dates.slice(i, i + BATCH);
    const fetched = await Promise.all(
      batch.map(async (date) => {
        try {
          const res = await apiFn(`/attendance/sheet?cohort_id=${cohortId}&date=${date}`);
          if (!res.session?.submitted_at) return null;
          return { date, location: res.session.location_type, students: res.students };
        } catch {
          return null;
        }
      }),
    );
    for (const item of fetched) {
      if (item) results.push(item);
    }
  }

  return results;
}

type Step = 1 | 2 | 3 | 4;
type ExportStep = 1 | 2 | 3;

type ImportState = {
  step: Step;
  fileName: string;
  rawText: string;
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  parseError: string | null;
  selectedTableKey: string;
  mapping: Record<string, string>;
  importing: boolean;
  importResult: { inserted: number; skipped: number; errors: string[] } | null;
  importError: string | null;
};

const INITIAL_STATE: ImportState = {
  step: 1,
  fileName: "",
  rawText: "",
  csvHeaders: [],
  csvRows: [],
  parseError: null,
  selectedTableKey: "",
  mapping: {},
  importing: false,
  importResult: null,
  importError: null,
};

const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: "Upload" },
  { step: 2, label: "Choose Table" },
  { step: 3, label: "Map Columns" },
  { step: 4, label: "Import" },
];

function groupTables(tables: ImportableTable[]) {
  return tables.reduce<Record<string, ImportableTable[]>>((acc, table) => {
    acc[table.group] = acc[table.group] ?? [];
    acc[table.group].push(table);
    return acc;
  }, {});
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

function normalizeImportResult(value: unknown, fallbackCount: number) {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const inserted = typeof record.inserted === "number" ? record.inserted : fallbackCount;
  const skipped = typeof record.skipped === "number" ? record.skipped : 0;
  const errors = Array.isArray(record.errors) ? record.errors.map((item) => String(item)) : [];
  return { inserted, skipped, errors };
}

function requiredMappedCount(columns: DbColumn[], mapping: Record<string, string>) {
  const mappedValues = new Set(Object.values(mapping).filter(Boolean));
  return columns.filter((column) => column.required && mappedValues.has(column.key)).length;
}

function getMissingRequiredColumns(columns: DbColumn[], mapping: Record<string, string>) {
  const mappedValues = new Set(Object.values(mapping).filter(Boolean));
  return columns.filter((column) => column.required && !mappedValues.has(column.key));
}

function getMappedDbColumns(headers: string[], mapping: Record<string, string>, dbColumns: DbColumn[]) {
  const used = new Set<string>();
  const result: DbColumn[] = [];

  headers.forEach((header) => {
    const mapped = mapping[header];
    if (!mapped || used.has(mapped)) return;
    const match = dbColumns.find((column) => column.key === mapped);
    if (!match) return;
    used.add(mapped);
    result.push(match);
  });

  return result;
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="csv-step-indicator" aria-label="CSV import steps">
      {STEPS.map((item, index) => {
        const isActive = item.step === step;
        const isComplete = item.step < step;
        return (
          <div key={item.step} className={`csv-step-indicator__item${isActive ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}>
            <div className="csv-step-indicator__circle">{isComplete ? "OK" : item.step}</div>
            <div className="csv-step-indicator__label">{item.label}</div>
            {index < STEPS.length - 1 ? <div className="csv-step-indicator__line" aria-hidden="true" /> : null}
          </div>
        );
      })}
    </div>
  );
}

const EXPORT_STEPS: Array<{ step: ExportStep; label: string }> = [
  { step: 1, label: "Choose Source" },
  { step: 2, label: "Choose Columns" },
  { step: 3, label: "Export" },
];

function ExportStepIndicator({ step }: { step: ExportStep }) {
  return (
    <div className="csv-step-indicator csv-step-indicator--3col" aria-label="Export steps">
      {EXPORT_STEPS.map((item, index) => {
        const isActive = item.step === step;
        const isComplete = item.step < step;
        return (
          <div
            key={item.step}
            className={`csv-step-indicator__item${isActive ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}
          >
            <div className="csv-step-indicator__circle">
              {isComplete ? "✓" : item.step}
            </div>
            <div className="csv-step-indicator__label">{item.label}</div>
            {index < EXPORT_STEPS.length - 1 ? (
              <div className="csv-step-indicator__line" aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type ExportPanelState = {
  selectedSourceKey: string;
  selectedColumnKeys: string[];
  rows: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  downloaded: boolean;
};

const EXPORT_INITIAL: ExportPanelState = {
  selectedSourceKey: "",
  selectedColumnKeys: [],
  rows: [],
  loading: false,
  error: null,
  downloaded: false,
};

function ExportPanel() {
  const [state, setState] = useState<ExportPanelState>(EXPORT_INITIAL);
  const [search, setSearch] = useState("");
  const [exportStep, setExportStep] = useState<ExportStep>(1);

  const selectedSource = EXPORTABLE_SOURCES.find((s) => s.key === state.selectedSourceKey) ?? null;
  const filteredSources = EXPORTABLE_SOURCES.filter((source) =>
    search.trim() === "" ||
    source.label.toLowerCase().includes(search.toLowerCase()) ||
    source.group.toLowerCase().includes(search.toLowerCase()),
  );
  const allColumnsSelected =
    selectedSource !== null && state.selectedColumnKeys.length === selectedSource.columns.length;

  const canFetch = Boolean(selectedSource);
  const canExport = state.rows.length > 0 && state.selectedColumnKeys.length > 0;

  const handleSelectSource = (source: ExportableSource) => {
    setState({
      ...EXPORT_INITIAL,
      selectedSourceKey: source.key,
      selectedColumnKeys: source.columns.map((c) => c.key),
    });
    setExportStep(2);
  };

  const handleFetch = async () => {
    if (!selectedSource) return;
    setState((prev) => ({ ...prev, loading: true, error: null, rows: [], downloaded: false }));
    try {
      const result = await apiList<Record<string, unknown>>(selectedSource.endpoint);
      setState((prev) => ({ ...prev, loading: false, rows: result.data }));
      setExportStep(3);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data.";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  };

  const handleExport = () => {
    if (!selectedSource || !state.rows.length) return;
    const exportColumns = selectedSource.columns.filter((c) =>
      state.selectedColumnKeys.includes(c.key),
    );
    const csv = buildExportCsv(state.rows, exportColumns);
    const date = new Date().toISOString().slice(0, 10);
    downloadExportCsv(csv, `${selectedSource.key}_${date}`);
    setState((prev) => ({ ...prev, downloaded: true }));
  };

  const toggleColumn = (key: string) => {
    setState((prev) => ({
      ...prev,
      selectedColumnKeys: prev.selectedColumnKeys.includes(key)
        ? prev.selectedColumnKeys.filter((k) => k !== key)
        : [...prev.selectedColumnKeys, key],
    }));
  };

  const handleReset = () => {
    setState(EXPORT_INITIAL);
    setExportStep(1);
    setSearch("");
  };

  return (
    <>
      <ExportStepIndicator step={exportStep} />
      <div className="csv-import-page__body">
        {exportStep === 1 ? (
          <section className="csv-panel csv-panel--export-preview">
            <div className="csv-panel__header">
              <h2>Step 1: Choose Data Source</h2>
              <p>Search and select which data to export.</p>
            </div>

            <div className="csv-source-select">
              <input
                className="csv-source-select__search"
                type="search"
                placeholder="Search sources…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
              <div className="csv-source-select__list" role="listbox" aria-label="Data sources">
                {filteredSources.map((source) => (
                  <button
                    key={source.key}
                    role="option"
                    aria-selected={state.selectedSourceKey === source.key}
                    type="button"
                    className={`csv-source-select__option${state.selectedSourceKey === source.key ? " is-selected" : ""}`}
                    onClick={() => handleSelectSource(source)}
                  >
                    <span className="csv-source-select__option-label">{source.label}</span>
                    <span className="csv-source-select__option-meta">
                      {source.group} · {source.columns.length} columns
                    </span>
                  </button>
                ))}
                {filteredSources.length === 0 ? (
                  <p className="csv-source-select__empty">No sources match "{search}"</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {selectedSource?.key === "attendance" && exportStep === 2 ? (
          <AttendanceExportPanel
            exportStep={exportStep}
            onBackToSource={() => {
              setState((prev) => ({ ...prev, rows: [], downloaded: false, error: null }));
              setExportStep(1);
            }}
            onBackToConfig={() => setExportStep(2)}
            onAdvance={() => setExportStep(3)}
            onReset={handleReset}
          />
        ) : exportStep === 2 && selectedSource ? (
          <section className="csv-panel csv-panel--export-preview">
            <div className="csv-panel__header">
              <h2>Step 2: Choose Columns</h2>
              <p>Select which columns to include in the export.</p>
            </div>

            <div className="csv-export-inline__columns-head">
              <span className="csv-export-inline__columns-label">Columns</span>
              <button
                className="csv-button"
                type="button"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    selectedColumnKeys: allColumnsSelected
                      ? []
                      : (selectedSource?.columns.map((c) => c.key) ?? []),
                  }))
                }
              >
                {allColumnsSelected ? "Unselect All" : "Select All"}
              </button>
            </div>

            <div className="csv-export-inline__columns">
              {selectedSource.columns.map((column) => (
                <button
                  key={column.key}
                  type="button"
                  className={`csv-export-inline__column${state.selectedColumnKeys.includes(column.key) ? " is-selected" : ""}`}
                  onClick={() => toggleColumn(column.key)}
                >
                  <input
                    type="checkbox"
                    checked={state.selectedColumnKeys.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span>{column.label}</span>
                </button>
              ))}
            </div>

          <div className="csv-actions">
            <button
              className="csv-button"
              type="button"
              onClick={() => {
                setState(EXPORT_INITIAL);
                setExportStep(1);
              }}
            >
              Back
            </button>
            <button
              className="csv-button csv-button--primary"
              type="button"
              disabled={!canFetch || state.loading || state.selectedColumnKeys.length === 0}
              onClick={() => void handleFetch()}
            >
              {state.loading ? "Loading data…" : "Next: Load Data"}
            </button>
          </div>

          {state.error ? (
            <div className="csv-message csv-message--error">{state.error}</div>
          ) : null}
          </section>
        ) : null}

        {exportStep === 3 && state.rows.length > 0 && selectedSource ? (
          <section className="csv-panel csv-panel--export-preview">
            <div className="csv-panel__header">
              <h2>Step 3: Preview & Export</h2>
              <p>
                {state.rows.length} rows loaded from <strong>{selectedSource.label}</strong>.
                Preview below, then download the CSV.
              </p>
            </div>

            <div className="csv-import-summary csv-import-summary--export">
              <div><strong>Source:</strong> {selectedSource.label}</div>
              <div><strong>Rows:</strong> {state.rows.length}</div>
              <div>
                <strong>Columns:</strong>{" "}
                {selectedSource.columns
                  .filter((c) => state.selectedColumnKeys.includes(c.key))
                  .map((c) => c.label)
                  .join(", ")}
              </div>
            </div>

            <div className="csv-preview-table-wrap csv-preview-table-wrap--fit">
              <table className="csv-preview-table">
                <thead>
                  <tr>
                    <th style={{ width: "48px", color: "var(--text-muted, #718096)", fontWeight: 600 }}>#</th>
                    {selectedSource.columns
                      .filter((c) => state.selectedColumnKeys.includes(c.key))
                      .map((c) => (
                        <th key={c.key}>{c.label}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {state.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--text-muted, #718096)", fontSize: "12px" }}>{i + 1}</td>
                      {selectedSource.columns
                        .filter((c) => state.selectedColumnKeys.includes(c.key))
                        .map((c) => (
                          <td key={c.key}>
                            {String(c.getValue(row) ?? "")}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {state.rows.length > 5 ? (
              <p className="csv-export-inline__preview-note">
                Showing first 5 of {state.rows.length} rows. All rows will be included in the export.
              </p>
            ) : null}

            {state.downloaded ? (
              <div className="csv-message csv-message--success">
                File downloaded successfully.
              </div>
            ) : null}

            <div className="csv-actions csv-actions--export">
              <button
                className="csv-button"
                type="button"
                onClick={() => {
                  setState((prev) => ({ ...prev, rows: [], downloaded: false }));
                  setExportStep(2);
                }}
              >
                Back
              </button>
              <button
                className="csv-import-btn csv-button--primary"
                type="button"
                disabled={!canExport}
                onClick={handleExport}
              >
                Download CSV ({state.rows.length} rows)
              </button>
              <button
                className="csv-button"
                type="button"
                onClick={handleReset}
              >
                Start Over
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

type AttendanceExportMode = "single_day" | "all_days" | "summary";

type AttendancePreview = {
  filename: string;
  header: string[];
  rows: string[][];
  summary: string;
};

function AttendanceExportPanel({
  exportStep,
  onBackToSource,
  onBackToConfig,
  onAdvance,
  onReset,
}: {
  exportStep: ExportStep;
  onBackToSource: () => void;
  onBackToConfig: () => void;
  onAdvance: () => void;
  onReset: () => void;
}) {
  const [cohorts, setCohorts] = useState<Array<{
    id: number;
    name: string;
    program_title: string | null;
    start_date: string | null;
    end_date: string | null;
  }>>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<AttendanceExportMode>("single_day");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const [preview, setPreview] = useState<AttendancePreview | null>(null);

  useEffect(() => {
    let active = true;
    apiList<{ id: number; name: string; program_title: string | null; start_date: string | null; end_date: string | null }>(
      "/cohorts?limit=500&sortBy=start_date&order=desc",
    )
      .then((res) => {
        if (!active) return;
        setCohorts(res.data);
        if (res.data.length) {
          setSelectedCohortId(String(res.data[0].id));
        }
      })
      .catch(() => {
        if (active) setError("Failed to load cohorts.");
      })
      .finally(() => {
        if (active) setLoadingCohorts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedCohort = cohorts.find((c) => String(c.id) === selectedCohortId) ?? null;

  useEffect(() => {
    setPreview(null);
    setDownloaded(false);
    setError("");
    setProgress("");
  }, [selectedCohortId, selectedDate, mode]);

  const handlePreparePreview = async () => {
    if (!selectedCohort) return;
    setExporting(true);
    setError("");
    setDownloaded(false);
    setProgress("");
    setPreview(null);

    const cohortLabel = selectedCohort.program_title
      ? `${selectedCohort.program_title} - ${selectedCohort.name}`
      : selectedCohort.name;
    const safeLabel = cohortLabel.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

    try {
      if (mode === "single_day") {
        setProgress("Loading sheet…");
        const res = await api<AttendanceSheetForExport>(
          `/attendance/sheet?cohort_id=${selectedCohort.id}&date=${selectedDate}`,
        );
        if (!res.students?.length) throw new Error("No students found for this date.");
        const header = ["#", "Name", "Email", "Phone", "Status", "Note"];
        const rows = res.students.map((s, i) => [
          String(i + 1),
          s.full_name,
          s.email ?? "",
          s.phone ?? "",
          s.attendance_status,
          s.note ?? "",
        ]);
        setPreview({
          filename: `attendance_${safeLabel}_${selectedDate}`,
          header,
          rows,
          summary: `${rows.length} students loaded for ${selectedDate}.`,
        });
      } else if (mode === "all_days") {
        setProgress("Fetching all sessions…");
        const sessions = await fetchAllAttendanceSessions(
          selectedCohort.id,
          selectedCohort.start_date,
          selectedCohort.end_date,
          (path) => api<AttendanceSheetForExport>(path),
        );
        if (!sessions.length) throw new Error("No submitted sessions found for this cohort.");
        setProgress(`Building CSV from ${sessions.length} sessions…`);

        const header = ["Date", "Location", "#", "Name", "Email", "Status", "Note"];
        const rows: string[][] = [];
        for (const session of sessions) {
          session.students.forEach((student, i) => {
            rows.push([
              session.date,
              session.location === "on_site" ? "On-site" : "Remote",
              String(i + 1),
              student.full_name,
              student.email ?? "",
              student.attendance_status,
              student.note ?? "",
            ]);
          });
        }
        setPreview({
          filename: `attendance_all_days_${safeLabel}`,
          header,
          rows,
          summary: `${sessions.length} submitted sessions loaded for ${cohortLabel}.`,
        });
      } else {
        setProgress("Fetching all sessions for summary…");
        const sessions = await fetchAllAttendanceSessions(
          selectedCohort.id,
          selectedCohort.start_date,
          selectedCohort.end_date,
          (path) => api<AttendanceSheetForExport>(path),
        );
        if (!sessions.length) throw new Error("No submitted sessions found for this cohort.");
        setProgress(`Counting ${sessions.length} sessions…`);

        const studentMap = new Map<number, {
          name: string;
          email: string;
          present: number;
          late: number;
          absent: number;
          total: number;
        }>();

        for (const session of sessions) {
          for (const student of session.students) {
            const existing = studentMap.get(student.student_user_id) ?? {
              name: student.full_name,
              email: student.email ?? "",
              present: 0,
              late: 0,
              absent: 0,
              total: 0,
            };
            if (student.attendance_status === "present") existing.present += 1;
            else if (student.attendance_status === "late") existing.late += 1;
            else existing.absent += 1;
            existing.total += 1;
            studentMap.set(student.student_user_id, existing);
          }
        }

        const header = ["#", "Name", "Email", "Present", "Late", "Absent", "Total Sessions", "Attendance %"];
        const rows = [...studentMap.values()].map((student, i) => {
          const pct = student.total > 0 ? Math.round(((student.present + student.late) / student.total) * 100) : 0;
          return [
            String(i + 1),
            student.name,
            student.email,
            String(student.present),
            String(student.late),
            String(student.absent),
            String(student.total),
            `${pct}%`,
          ];
        });
        setPreview({
          filename: `attendance_summary_${safeLabel}`,
          header,
          rows,
          summary: `${sessions.length} submitted sessions summarized across ${rows.length} students.`,
        });
      }

      setProgress("");
      onAdvance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
      setProgress("");
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    const csv = [preview.header, ...preview.rows]
      .map((row) => row.map((value) => toCsvCell(value)).join(","))
      .join("\r\n");
    downloadExportCsv(csv, preview.filename);
    setDownloaded(true);
  };

  const modes: Array<{ key: AttendanceExportMode; label: string; desc: string }> = [
    { key: "single_day", label: "Single day", desc: "One cohort, one date — the exact attendance sheet for that session." },
    { key: "all_days", label: "All days", desc: "Every submitted session for this cohort, one row per student per day." },
    { key: "summary", label: "Summary per student", desc: "Total present / late / absent counts per student across all sessions." },
  ];

  return (
    <section className="csv-panel csv-panel--export-preview">
      {exportStep === 2 ? (
        <>
        <div className="csv-panel__header">
          <h2>Attendance export</h2>
          <p>Choose a cohort and export mode, then continue to preview.</p>
        </div>

        <label className="csv-att-field">
          <span className="csv-att-label">Cohort</span>
          <select
            className="csv-att-select"
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            disabled={loadingCohorts || !cohorts.length}
          >
            {loadingCohorts ? (
              <option>Loading…</option>
            ) : !cohorts.length ? (
              <option>No cohorts found</option>
            ) : (
              cohorts.map((cohort) => (
                <option key={cohort.id} value={String(cohort.id)}>
                  {cohort.program_title ? `${cohort.program_title} – ${cohort.name}` : cohort.name}
                </option>
              ))
            )}
          </select>
        </label>

        <div className="csv-att-modes">
          {modes.map((item) => (
            <label key={item.key} className={`csv-att-mode${mode === item.key ? " is-selected" : ""}`}>
              <input
                type="radio"
                name="att-export-mode"
                value={item.key}
                checked={mode === item.key}
                onChange={() => setMode(item.key)}
              />
              <div>
                <span className="csv-att-mode__label">{item.label}</span>
                <span className="csv-att-mode__desc">{item.desc}</span>
              </div>
            </label>
          ))}
        </div>

        {mode === "single_day" ? (
          <label className="csv-att-field">
            <span className="csv-att-label">Date</span>
            <input
              className="csv-att-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
        ) : (
          <p className="csv-att-range-note">
            {selectedCohort?.start_date
              ? `Will fetch sessions from ${selectedCohort.start_date} to today.`
              : "Select a cohort to see the date range."}
          </p>
        )}

        {error ? <div className="csv-message csv-message--error">{error}</div> : null}
        {progress ? <div className="csv-message">{progress}</div> : null}

        <div className="csv-actions">
          <button
            className="csv-button"
            type="button"
            onClick={onBackToSource}
          >
            Back
          </button>
          <button
            className="csv-import-btn"
            type="button"
            disabled={exporting || !selectedCohort}
            onClick={() => void handlePreparePreview()}
          >
            {exporting ? "Preparing…" : "Next"}
          </button>
        </div>
        </>
      ) : preview ? (
        <>
          <div className="csv-panel__header">
            <h2>Step 3: Preview & Export</h2>
            <p>{preview.summary}</p>
          </div>

          <div className="csv-import-summary csv-import-summary--export">
            <div><strong>Cohort:</strong> {selectedCohort ? (selectedCohort.program_title ? `${selectedCohort.program_title} - ${selectedCohort.name}` : selectedCohort.name) : "—"}</div>
            <div><strong>Mode:</strong> {modes.find((item) => item.key === mode)?.label ?? mode}</div>
            <div><strong>Rows:</strong> {preview.rows.length}</div>
            <div><strong>Columns:</strong> {preview.header.join(", ")}</div>
          </div>

          <div className="csv-preview-table-wrap csv-preview-table-wrap--fit">
            <table className="csv-preview-table">
              <thead>
                <tr>
                  {preview.header.map((cell) => (
                    <th key={cell}>{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.rows.length > 5 ? (
            <p className="csv-export-inline__preview-note">
              Showing first 5 of {preview.rows.length} rows. All rows will be included in the export.
            </p>
          ) : null}

          {downloaded ? <div className="csv-message csv-message--success">File downloaded successfully.</div> : null}

          <div className="csv-actions csv-actions--export">
            <button
              className="csv-button"
              type="button"
              onClick={() => {
                setDownloaded(false);
                onBackToConfig();
              }}
            >
              Back
            </button>
            <button
              className="csv-import-btn csv-button--primary"
              type="button"
              onClick={handleDownload}
            >
              Download CSV ({preview.rows.length} rows)
            </button>
            <button
              className="csv-button"
              type="button"
              onClick={() => {
                setPreview(null);
                setDownloaded(false);
                onReset();
              }}
            >
              Start Over
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

export function CsvImportPage() {
  const [state, setState] = useState<ImportState>(INITIAL_STATE);
  const [isDragging, setIsDragging] = useState(false);
  const [tab, setTab] = useState<"import" | "export">("import");

  const selectedTable = useMemo(
    () => IMPORTABLE_TABLES.find((table) => table.key === state.selectedTableKey) ?? null,
    [state.selectedTableKey],
  );

  const groupedTables = useMemo(() => groupTables(IMPORTABLE_TABLES), []);
  const mappedColumns = useMemo(
    () => selectedTable ? getMappedDbColumns(state.csvHeaders, state.mapping, selectedTable.columns) : [],
    [selectedTable, state.csvHeaders, state.mapping],
  );
  const missingRequired = useMemo(
    () => selectedTable ? getMissingRequiredColumns(selectedTable.columns, state.mapping) : [],
    [selectedTable, state.mapping],
  );
  const previewRows = useMemo(
    () => selectedTable ? applyMapping(state.csvRows.slice(0, 5), state.mapping, selectedTable.columns) : [],
    [selectedTable, state.csvRows, state.mapping],
  );
  const mappedRequiredCount = useMemo(
    () => selectedTable ? requiredMappedCount(selectedTable.columns, state.mapping) : 0,
    [selectedTable, state.mapping],
  );
  const skippedCsvColumns = useMemo(
    () => state.csvHeaders.filter((header) => !state.mapping[header]),
    [state.csvHeaders, state.mapping],
  );
  const autoMapping = useMemo(
    () => selectedTable ? detectAutoMapping(state.csvHeaders, selectedTable.columns) : {},
    [selectedTable, state.csvHeaders],
  );

  const resetAll = () => {
    setState(INITIAL_STATE);
    setIsDragging(false);
  };

  const parseFile = async (file: File) => {
    try {
      const rawText = await readFileAsText(file);
      const parsed = parseCSV(rawText);

      if (!parsed.headers.length) {
        setState((current) => ({
          ...current,
          fileName: file.name,
          rawText,
          csvHeaders: [],
          csvRows: [],
          parseError: "The CSV file is empty or has no headers.",
          selectedTableKey: "",
          mapping: {},
          step: 1,
          importResult: null,
          importError: null,
        }));
        return;
      }

      setState((current) => ({
        ...current,
        fileName: file.name,
        rawText,
        csvHeaders: parsed.headers,
        csvRows: parsed.rows,
        parseError: null,
        selectedTableKey: "",
        mapping: {},
        step: 1,
        importResult: null,
        importError: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        parseError: error instanceof Error ? error.message : "Failed to parse CSV file.",
        csvHeaders: [],
        csvRows: [],
        selectedTableKey: "",
        mapping: {},
      }));
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await parseFile(file);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await parseFile(file);
  };

  const handleSelectTable = (table: ImportableTable) => {
    setState((current) => ({
      ...current,
      selectedTableKey: table.key,
      mapping: detectAutoMapping(current.csvHeaders, table.columns),
      importResult: null,
      importError: null,
    }));
  };

  const updateMapping = (csvHeader: string, dbColumn: string) => {
    setState((current) => ({
      ...current,
      mapping: {
        ...current.mapping,
        [csvHeader]: dbColumn,
      },
    }));
  };

  const handleImport = async () => {
    if (!selectedTable) return;

    const rows = applyMapping(state.csvRows, state.mapping, selectedTable.columns);

    setState((current) => ({
      ...current,
      importing: true,
      importError: null,
      importResult: null,
    }));

    try {
      const result = await api<unknown>("/admin/import", {
        method: "POST",
        body: JSON.stringify({
          table: selectedTable.key,
          rows,
        }),
      });

      setState((current) => ({
        ...current,
        importing: false,
        importResult: normalizeImportResult(result, rows.length),
      }));
    } catch (error) {
      let message = "Import failed.";
      if (error instanceof ApiError) {
        if (error.status === 404) {
          message = "Import endpoint is not available yet. The frontend is ready, but /admin/import is not implemented on the server.";
        } else {
          message = error.message || message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      setState((current) => ({
        ...current,
        importing: false,
        importError: message,
      }));
    }
  };

  const canGoToStep2 = state.csvRows.length > 0 && state.csvHeaders.length > 0 && !state.parseError;
  const canGoToStep3 = Boolean(selectedTable);
  const canGoToStep4 = Boolean(selectedTable) && missingRequired.length === 0;

  useEffect(() => {
    setTab("import");
  }, []);

  return (
    <PageShell>
      <div className="csv-import-page">
        <div className="csv-import-page__header">
          <h1 className="csv-import-page__title">
            {tab === "import" ? "Import CSV" : "Export CSV"}
          </h1>
          <p className="csv-import-page__subtitle">
            {tab === "import"
              ? "Upload a CSV file, map it to a database table, preview the transformed rows, and send the import payload to the API."
              : "Choose a data source, select columns, preview the data, and download it as a CSV file."}
          </p>
        </div>

        <div className="csv-page-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "import"}
            className={`csv-page-tab${tab === "import" ? " csv-page-tab--active" : ""}`}
            type="button"
            onClick={() => setTab("import")}
          >
            Import
          </button>
          <button
            role="tab"
            aria-selected={tab === "export"}
            className={`csv-page-tab${tab === "export" ? " csv-page-tab--active" : ""}`}
            type="button"
            onClick={() => setTab("export")}
          >
            Export
          </button>
        </div>

        {tab === "import" ? (
          <>
            <StepIndicator step={state.step} />
            <div className="csv-import-page__body">
            {state.step === 1 ? (
          <section className="csv-panel">
            <div className="csv-panel__header">
              <h2>Step 1: Upload CSV</h2>
              <p>Drop a CSV file here or browse from disk.</p>
            </div>

            <div
              className={`csv-dropzone${isDragging ? " csv-dropzone--dragging" : ""}${state.csvRows.length > 0 ? " csv-dropzone--loaded" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget === event.target) {
                  setIsDragging(false);
                }
              }}
              onDrop={(event) => {
                void handleDrop(event);
              }}
            >
              {state.csvRows.length === 0 ? (
                <>
                  <div className="csv-dropzone__icon">CSV</div>
                  <p className="csv-dropzone__text">Drop your CSV file here</p>
                  <p className="csv-dropzone__sub">or</p>
                  <label className="csv-dropzone__browse-btn">
                    Browse file
                    <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(event) => void handleFileChange(event)} />
                  </label>
                </>
              ) : (
                <>
                  <div className="csv-dropzone__icon">OK</div>
                  <p className="csv-dropzone__loaded-name">{state.fileName}</p>
                  <p className="csv-dropzone__loaded-stats">{state.csvRows.length} rows · {state.csvHeaders.length} columns</p>
                  <button className="csv-dropzone__change-btn" type="button" onClick={resetAll}>Change file</button>
                </>
              )}
            </div>

            {state.parseError ? <div className="csv-message csv-message--error">{state.parseError}</div> : null}

            <div className="csv-actions">
              <button className="csv-button csv-button--primary" type="button" disabled={!canGoToStep2} onClick={() => setState((current) => ({ ...current, step: 2 }))}>
                Next
              </button>
            </div>
          </section>
            ) : null}

            {state.step === 2 ? (
          <section className="csv-panel">
            <div className="csv-panel__header">
              <h2>Step 2: Choose Table</h2>
              <p>Select the target database table for this CSV file.</p>
            </div>

            {Object.entries(groupedTables).map(([group, tables]) => (
              <div key={group} className="csv-table-group">
                <h3 className="csv-table-group__title">{group}</h3>
                <div className="csv-table-grid">
                  {tables.map((table) => {
                    const requiredCount = table.columns.filter((column) => column.required).length;
                    const isSelected = table.key === state.selectedTableKey;
                    return (
                      <button
                        key={table.key}
                        type="button"
                        className={`csv-table-card${isSelected ? " is-selected" : ""}`}
                        onClick={() => handleSelectTable(table)}
                      >
                        <span className="csv-table-card__label">{table.label}</span>
                        <span className="csv-table-card__meta">{requiredCount} required</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="csv-actions">
              <button className="csv-button" type="button" onClick={() => setState((current) => ({ ...current, step: 1 }))}>
                Back
              </button>
              <button className="csv-button csv-button--primary" type="button" disabled={!canGoToStep3} onClick={() => setState((current) => ({ ...current, step: 3 }))}>
                Next
              </button>
            </div>
          </section>
            ) : null}

            {state.step === 3 && selectedTable ? (
          <section className="csv-panel">
            <div className="csv-panel__header">
              <h2>Step 3: Map Columns</h2>
              <p>Match CSV headers to the database columns in <strong>{selectedTable.label}</strong>.</p>
            </div>

            <div className="csv-mapping-table-wrap">
              <table className="csv-mapping-table">
                <thead>
                  <tr>
                    <th>CSV Column</th>
                    <th aria-hidden="true">To</th>
                    <th>Database Column</th>
                  </tr>
                </thead>
                <tbody>
                  {state.csvHeaders.map((csvHeader) => {
                    const firstRowValue = state.csvRows[0]?.[csvHeader] ?? "";
                    const mappedDbColumn = state.mapping[csvHeader] ?? "";
                    const isAutoMapped = autoMapping[csvHeader] === mappedDbColumn && Boolean(mappedDbColumn);

                    return (
                      <tr key={csvHeader} className={`csv-mapping-row${isAutoMapped ? " csv-mapping-row--auto" : ""}`}>
                        <td className="csv-mapping-cell csv-mapping-cell--csv">
                          <span className="csv-mapping-cell__header">{csvHeader}</span>
                          {isAutoMapped ? <span className="csv-mapping-badge csv-mapping-badge--auto">Auto</span> : null}
                          <span className="csv-mapping-cell__sample">{firstRowValue || "Empty sample"}</span>
                        </td>
                        <td className="csv-mapping-cell csv-mapping-cell--arrow">To</td>
                        <td className="csv-mapping-cell csv-mapping-cell--db">
                          <select
                            className="csv-mapping-select"
                            value={mappedDbColumn}
                            onChange={(event) => updateMapping(csvHeader, event.target.value)}
                          >
                            <option value="">-- Skip --</option>
                            {selectedTable.columns.map((column) => (
                              <option key={column.key} value={column.key}>
                                {column.label}{column.required ? " *" : ""}{column.hint ? ` (${column.hint})` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="csv-mapping-summary">
              <span>{mappedRequiredCount} required fields mapped</span>
              <span>{skippedCsvColumns.length} columns will be skipped</span>
            </div>

            {missingRequired.length > 0 ? (
              <div className="csv-message csv-message--warning">
                These required fields are not mapped yet: {missingRequired.map((column) => column.key).join(", ")}
              </div>
            ) : null}

            <div className="csv-actions">
              <button className="csv-button" type="button" onClick={() => setState((current) => ({ ...current, step: 2 }))}>
                Back
              </button>
              <button className="csv-button csv-button--primary" type="button" disabled={!canGoToStep4} onClick={() => setState((current) => ({ ...current, step: 4 }))}>
                Next
              </button>
            </div>
          </section>
            ) : null}

            {state.step === 4 && selectedTable ? (
          <section className="csv-panel">
            <div className="csv-panel__header">
              <h2>Step 4: Preview & Import</h2>
              <p>Review the mapped rows before sending them to the backend.</p>
            </div>

            <div className="csv-import-summary">
              <div><strong>Table:</strong> {selectedTable.label}</div>
              <div><strong>Total rows:</strong> {state.csvRows.length}</div>
              <div><strong>Columns being imported:</strong> {mappedColumns.map((column) => column.key).join(", ") || "None"}</div>
              <div><strong>Columns being skipped:</strong> {skippedCsvColumns.join(", ") || "None"}</div>
            </div>

            <div className="csv-preview-table-wrap">
              <table className="csv-preview-table">
                <thead>
                  <tr>
                    {mappedColumns.map((column) => (
                      <th key={column.key}>{column.key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={`preview-${rowIndex}`}>
                      {mappedColumns.map((column) => (
                        <td key={`${rowIndex}-${column.key}`}>{row[column.key] == null ? "null" : String(row[column.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {state.importError ? <div className="csv-message csv-message--error">{state.importError}</div> : null}

            {state.importResult ? (
              <div className="csv-result-card">
                <div><strong>Inserted:</strong> {state.importResult.inserted}</div>
                <div><strong>Skipped:</strong> {state.importResult.skipped}</div>
                <div><strong>Errors:</strong> {state.importResult.errors.length}</div>
                {state.importResult.errors.length > 0 ? (
                  <ul className="csv-result-card__errors">
                    {state.importResult.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="csv-actions">
              <button className="csv-button" type="button" onClick={() => setState((current) => ({ ...current, step: 3 }))}>
                Back
              </button>
              <button className="csv-import-btn" type="button" disabled={state.importing || mappedColumns.length === 0} onClick={() => void handleImport()}>
                {state.importing ? "Importing..." : `Import ${state.csvRows.length} rows`}
              </button>
              {state.importResult ? (
                <button className="csv-button" type="button" onClick={resetAll}>
                  Import Another File
                </button>
              ) : null}
            </div>
          </section>
            ) : null}
            </div>
          </>
        ) : null}

        {tab === "export" ? <ExportPanel /> : null}
      </div>
    </PageShell>
  );
}
