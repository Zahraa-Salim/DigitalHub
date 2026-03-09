// File: frontend/src/dashboard/pages/admin/ProgramsPage.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Card } from "../../components/Card";
import type { ChangeEvent } from "react";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { StatsCard } from "../../components/StatsCard";
import { Table } from "../../components/Table";
import { RichTextEditor } from "../../components/RichTextEditor";
import { ImageUpload } from "../../components/ImageUpload";
import { ValidationMessage } from "../../components/ValidationMessage";
import { BulkActionsToolbar } from "../../components/BulkActionsToolbar";
import { QuickPreviewPanel, type PreviewField } from "../../components/QuickPreviewPanel";
import { AdvancedFilterPanel, type FilterCondition } from "../../components/AdvancedFilterPanel";
import { API_URL, ApiError, api, apiList } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";
import { exportToCSV, exportToJSON, exportToTSV, generateFilename } from "../../utils/exportData";

type ProgramRow = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  requirements: string | null;
  image_url: string | null;
  default_capacity: number | null;
  is_published: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  // Extended fields
  featured?: boolean;
  featured_rank?: number | null;
  meta_title?: string;
  meta_description?: string;
  featured_image_url?: string;
};

type ProgramCardStyle = "modern" | "classic";

type CmsSiteSettingsRow = {
  id: number;
  contact_info: Record<string, unknown> | null;
};

type ProgramFormState = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  requirements: string;
  imageUrl: string;
  defaultCapacity: string;
  featured: boolean;
  featuredRank: string;
  metaTitle: string;
  metaDescription: string;
  featuredImageUrl: string;
};

type FormMode = "create" | "edit" | null;

// Filter fields for Programs
const PROGRAM_FILTER_FIELDS = [
  { name: "title", label: "Title", type: "text" as const },
  { name: "slug", label: "Slug", type: "text" as const },
  { name: "summary", label: "Summary", type: "text" as const },
  { name: "is_published", label: "Published", type: "checkbox" as const },
  { name: "default_capacity", label: "Capacity", type: "number" as const },
  { name: "created_at", label: "Created Date", type: "date" as const },
  { name: "updated_at", label: "Updated Date", type: "date" as const },
];

const initialForm: ProgramFormState = {
  slug: "",
  title: "",
  summary: "",
  description: "",
  requirements: "",
  imageUrl: "",
  defaultCapacity: "",
  featured: false,
  featuredRank: "",
  metaTitle: "",
  metaDescription: "",
  featuredImageUrl: "",
};

function resolveProgramImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")) {
    return imageUrl;
  }
  const normalizedPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  try {
    const apiUrl = new URL(API_URL);
    return `${apiUrl.origin}${normalizedPath}`;
  } catch {
    return `${API_URL.replace(/\/$/, "")}${normalizedPath}`;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function parseImageDataUrl(value: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(value);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), base64: match[2] };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toProgramCardStyle(value: unknown): ProgramCardStyle {
  return value === "classic" ? "classic" : "modern";
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toFormState(program: ProgramRow | null): ProgramFormState {
  if (!program) return initialForm;
  return {
    slug: program.slug,
    title: program.title,
    summary: program.summary ?? "",
    description: program.description ?? "",
    requirements: program.requirements ?? "",
    imageUrl: program.image_url ?? "",
    defaultCapacity: program.default_capacity === null ? "" : String(program.default_capacity),
    featured: program.featured ?? false,
    featuredRank: program.featured_rank === null || program.featured_rank === undefined ? "" : String(program.featured_rank),
    metaTitle: program.meta_title ?? "",
    metaDescription: program.meta_description ?? "",
    featuredImageUrl: program.featured_image_url ?? "",
  };
}

export function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"updated_at" | "created_at" | "title">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<ProgramRow | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<ProgramRow | null>(null);
  const [form, setForm] = useState<ProgramFormState>(initialForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProgramRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [programCardStyle, setProgramCardStyle] = useState<ProgramCardStyle>("modern");
  const [siteContactInfo, setSiteContactInfo] = useState<Record<string, unknown>>({});
  const [programStyleNotice, setProgramStyleNotice] = useState("");
  const [programStyleError, setProgramStyleError] = useState("");
  const [isSavingProgramStyle, setIsSavingProgramStyle] = useState(false);
  
  // Phase 5: Bulk actions state
  const [selectedPrograms, setSelectedPrograms] = useState<Set<number>>(new Set());
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // Phase 5: Preview panel state
  const [previewProgram, setPreviewProgram] = useState<ProgramRow | null>(null);
  
  // Phase 5: Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([]);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [filterSheetOffset, setFilterSheetOffset] = useState(0);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  
  const filterDragStartYRef = useRef<number | null>(null);
  const filterOffsetRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const loadPrograms = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiList<ProgramRow>(
          `/programs${buildQueryString({
            search: debouncedSearch || undefined,
            limit: 100,
            sortBy,
            order: sortOrder,
          })}`,
        );
        if (!active) return;
        setPrograms(result.data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message || "Failed to load programs." : "Failed to load programs.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadPrograms();
    return () => { active = false; };
  }, [debouncedSearch, refreshKey, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;
    const loadProgramCardStyle = async () => {
      try {
        const settings = await api<CmsSiteSettingsRow>("/cms/site-settings");
        if (!active) return;
        const contactInfo = isObjectRecord(settings.contact_info) ? settings.contact_info : {};
        setSiteContactInfo(contactInfo);
        setProgramCardStyle(toProgramCardStyle(contactInfo.program_card_style));
      } catch {
        if (!active) return;
        setProgramCardStyle("modern");
      }
    };
    void loadProgramCardStyle();
    return () => { active = false; };
  }, []);

  const totalPrograms = programs.length;
  const lastUpdated = programs[0]?.updated_at ?? "";
  const formTitle = formMode === "create" ? "Add Program" : "Edit Program";
  const formImageSrc = useMemo(() => resolveProgramImageUrl(form.imageUrl || null), [form.imageUrl]);
  const rows = useMemo(() => programs, [programs]);

  useEffect(() => { setImagePreviewFailed(false); }, [formImageSrc]);

  const openCreate = () => {
    setFormMode("create");
    setEditing(null);
    setForm(initialForm);
    setImagePreviewFailed(false);
    setFormError("");
    setSuccess("");
  };

  const openEdit = (program: ProgramRow) => {
    setFormMode("edit");
    setEditing(program);
    setForm(toFormState(program));
    setImagePreviewFailed(false);
    setFormError("");
    setSuccess("");
  };

  const closeForm = () => {
    if (isSubmitting || isUploadingImage) return;
    setFormMode(null);
    setEditing(null);
    setFormError("");
  };

  const parseCapacity = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) throw new Error("Capacity must be a whole number >= 0.");
    return parsed;
  };

  const uploadProgramImageFromDataUrl = async (dataUrl: string): Promise<string> => {
    const parsed = parseImageDataUrl(dataUrl);
    if (!parsed) throw new Error("Invalid program image data.");
    const uploaded = await api<{ image_url: string }>("/programs/image", {
      method: "POST",
      body: JSON.stringify({ filename: "program-image", mime_type: parsed.mimeType, data_base64: parsed.base64 }),
    });
    return uploaded.image_url;
  };

  const handleProgramImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFormError("Only JPG, PNG, and WEBP files are allowed.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setFormError("Program image must be 3MB or less.");
      return;
    }
    setIsUploadingImage(true);
    setFormError("");
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((current) => ({ ...current, imageUrl: dataUrl }));
      setImagePreviewFailed(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const rawSlug = form.slug.trim() || title;
    const slug = slugify(rawSlug);
    if (!title) { setFormError("Program title is required."); return; }
    if (!slug) { setFormError("Program slug is required."); return; }

    let defaultCapacity: number | undefined;
    try { defaultCapacity = parseCapacity(form.defaultCapacity); }
    catch (capacityError) {
      setFormError(capacityError instanceof Error ? capacityError.message : "Invalid capacity.");
      return;
    }

    const payload: Record<string, unknown> = {
      slug, title,
      summary: form.summary.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim(),
      image_url: form.imageUrl.trim(),
      featured: form.featured,
      meta_title: form.metaTitle.trim(),
      meta_description: form.metaDescription.trim(),
      featured_image_url: form.featuredImageUrl.trim(),
    };
    if (defaultCapacity !== undefined) payload.default_capacity = defaultCapacity;
    if (form.featured && form.featuredRank.trim()) {
      try { payload.featured_rank = parseInt(form.featuredRank, 10); } catch { /* ignore */ }
    }

    setIsSubmitting(true);
    setFormError("");
    setError("");

    try {
      const imageInput = String(payload.image_url || "");
      if (imageInput.startsWith("data:image/")) {
        const uploadedImage = await uploadProgramImageFromDataUrl(imageInput);
        payload.image_url = uploadedImage;
        setForm((current) => ({ ...current, imageUrl: uploadedImage }));
      }

      if (formMode === "create") {
        await api<ProgramRow>("/programs", { method: "POST", body: JSON.stringify({ ...payload, is_published: true }) });
        setSuccess("Program added successfully.");
      } else if (formMode === "edit" && editing) {
        await api<ProgramRow>(`/programs/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess("Program updated successfully.");
      }
      setFormMode(null);
      setEditing(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message || "Failed to save program." : "Failed to save program.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveProgramCardStyle = async () => {
    setProgramStyleNotice("");
    setProgramStyleError("");
    setIsSavingProgramStyle(true);
    try {
      const nextContactInfo: Record<string, unknown> = { ...siteContactInfo, program_card_style: programCardStyle };
      const updated = await api<CmsSiteSettingsRow>("/cms/site-settings", {
        method: "PATCH",
        body: JSON.stringify({ contact_info: nextContactInfo }),
      });
      const updatedContactInfo = isObjectRecord(updated.contact_info) ? updated.contact_info : {};
      setSiteContactInfo(updatedContactInfo);
      setProgramCardStyle(toProgramCardStyle(updatedContactInfo.program_card_style));
      setProgramStyleNotice("Program card style saved.");
    } catch (err) {
      setProgramStyleError(err instanceof ApiError ? err.message : "Failed to save program card style.");
    } finally {
      setIsSavingProgramStyle(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError("");
    try {
      await api<{ id: number }>(`/programs/${deleteTarget.id}`, { method: "DELETE" });
      setSuccess("Program deleted successfully.");
      setDeleteTarget(null);
      setSelectedPrograms((prev) => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message || "Failed to delete program." : "Failed to delete program.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Phase 5: Bulk actions handlers
  const toggleProgramSelection = (programId: number) => {
    setSelectedPrograms((prev) => { const next = new Set(prev); if (next.has(programId)) next.delete(programId); else next.add(programId); return next; });
  };

  const toggleSelectAll = () => {
    if (selectedPrograms.size === programs.length) setSelectedPrograms(new Set());
    else setSelectedPrograms(new Set(programs.map((p) => p.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedPrograms.size === 0) return;
    const confirmed = window.confirm(`Delete ${selectedPrograms.size} program(s)? This cannot be undone.`);
    if (!confirmed) return;
    setIsProcessingBulk(true);
    setError("");
    try {
      const deletePromises = Array.from(selectedPrograms).map((id) => api<{ id: number }>(`/programs/${id}`, { method: "DELETE" }));
      await Promise.all(deletePromises);
      setSuccess(`${selectedPrograms.size} program(s) deleted successfully.`);
      setSelectedPrograms(new Set());
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message || "Failed to delete some programs." : "Failed to delete programs.");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkExport = (format: 'csv' | 'json' | 'tsv') => {
    const selectedData = programs.filter((p) => selectedPrograms.has(p.id)).map((p) => ({
      id: p.id, slug: p.slug, title: p.title, summary: p.summary, description: p.description,
      requirements: p.requirements, default_capacity: p.default_capacity, is_published: p.is_published,
      created_at: p.created_at, updated_at: p.updated_at,
    }));
    const filename = generateFilename(`programs-export-${selectedData.length}`, true);
    if (format === 'csv') exportToCSV(selectedData, filename);
    else if (format === 'json') exportToJSON(selectedData, filename);
    else exportToTSV(selectedData, filename);
    setSuccess(`Exported ${selectedData.length} program(s) to ${format.toUpperCase()}.`);
  };

  const handlePreview = (program: ProgramRow) => { setPreviewProgram(program); };
  const getPreviewFields = (): PreviewField[] => {
    if (!previewProgram) return [];
    return [
      { label: "Title", value: previewProgram.title, type: "text" },
      { label: "Slug", value: previewProgram.slug, type: "text" },
      { label: "Summary", value: previewProgram.summary, type: "text" },
      { label: "Description", value: previewProgram.description, type: "html" },
      { label: "Requirements", value: previewProgram.requirements, type: "text" },
      { label: "Image", value: resolveProgramImageUrl(previewProgram.image_url) ?? undefined, type: "image" },
      { label: "Featured Image", value: resolveProgramImageUrl(previewProgram.featured_image_url) ?? undefined, type: "image" },
      { label: "Capacity", value: previewProgram.default_capacity ?? "Not set", type: "text" },
      { label: "Published", value: previewProgram.is_published, type: "boolean" },
      { label: "Featured", value: previewProgram.featured ?? false, type: "boolean" },
      { label: "Featured Rank", value: previewProgram.featured_rank ?? null, type: "text" },
      { label: "SEO Title", value: previewProgram.meta_title ?? "", type: "text" },
      { label: "SEO Description", value: previewProgram.meta_description ?? "", type: "text" },
      { label: "Created", value: previewProgram.created_at, type: "date" },
      { label: "Updated", value: previewProgram.updated_at, type: "date" },
    ];
  };

  const handleAdvancedFilterApply = () => { setSuccess(`Applied ${advancedFilters.length} filter(s).`); };
  const handleAdvancedFilterReset = () => { setAdvancedFilters([]); setSuccess("Filters reset."); };

  const openMobileFilters = () => { setShowFiltersMobile(true); setFilterSheetOffset(0); filterOffsetRef.current = 0; };
  const closeMobileFilters = () => { setShowFiltersMobile(false); setIsFilterDragging(false); setFilterSheetOffset(0); filterOffsetRef.current = 0; filterDragStartYRef.current = null; };
  const handleFilterDragStart = (event: ReactPointerEvent<HTMLDivElement>) => { filterDragStartYRef.current = event.clientY; setIsFilterDragging(true); };

  useEffect(() => {
    if (!isFilterDragging) return;
    const handlePointerMove = (event: PointerEvent) => {
      if (filterDragStartYRef.current === null) return;
      const delta = Math.max(0, event.clientY - filterDragStartYRef.current);
      filterOffsetRef.current = delta;
      setFilterSheetOffset(delta);
    };
    const handlePointerUp = () => {
      const shouldClose = filterOffsetRef.current > 130;
      setIsFilterDragging(false);
      filterDragStartYRef.current = null;
      if (shouldClose) { closeMobileFilters(); return; }
      filterOffsetRef.current = 0;
      setFilterSheetOffset(0);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => { window.removeEventListener("pointermove", handlePointerMove); window.removeEventListener("pointerup", handlePointerUp); };
  }, [isFilterDragging]);

  useEffect(() => {
    if (!showFiltersMobile) return;
    const mediaQuery = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = () => { if (mediaQuery.matches) { setShowFiltersMobile(false); setIsFilterDragging(false); setFilterSheetOffset(0); filterOffsetRef.current = 0; filterDragStartYRef.current = null; } };
    closeOnDesktop();
    mediaQuery.addEventListener("change", closeOnDesktop);
    return () => mediaQuery.removeEventListener("change", closeOnDesktop);
  }, [showFiltersMobile]);

  return (
    <PageShell title="Programs" subtitle="Manage program templates used by cohorts."
      actions={<button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={openCreate}>Add Program</button>}>
      <div className="dh-page">
        <div className="stats-grid stats-grid--compact dh-stats">
          <StatsCard label="Total Programs" value={String(totalPrograms)} hint="Templates in database" />
          <StatsCard label="Last Updated" value={lastUpdated ? formatDateTime(lastUpdated) : "No records"} hint="Most recently changed" />
        </div>

        <Card className="card--compact-row">
          <div>
            <h3 className="section-title">Website Program Card Style</h3>
            <p className="info-text">Choose the card design used on the public home and programs pages.</p>
          </div>
          <div className="dh-program-style-controls">
            <label className="field">
              <span className="field__label">Card Style</span>
              <select className="field__control" value={programCardStyle} onChange={(e) => setProgramCardStyle(e.target.value as ProgramCardStyle)} disabled={isSavingProgramStyle}>
                <option value="modern">Modern Gradient</option>
                <option value="classic">Classic Minimal</option>
              </select>
            </label>
            <button className="btn btn--primary dh-btn" type="button" onClick={saveProgramCardStyle} disabled={isSavingProgramStyle}>
              {isSavingProgramStyle ? "Saving..." : "Save Style"}
            </button>
          </div>
        </Card>

        {programStyleNotice && <Card><p className="alert alert--success dh-alert">{programStyleNotice}</p></Card>}
        {programStyleError && <Card><p className="alert alert--error dh-alert">{programStyleError}</p></Card>}

        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar className="dh-form-grid" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search program title"
              selects={[
                { label: "Sort By", value: sortBy, options: [{ label: "Last Updated", value: "updated_at" }, { label: "Created Date", value: "created_at" }, { label: "Title", value: "title" }], onChange: (v) => setSortBy(v as "updated_at" | "created_at" | "title") },
                { label: "Sort Order", value: sortOrder, options: [{ label: "Descending", value: "desc" }, { label: "Ascending", value: "asc" }], onChange: (v) => setSortOrder(v as "asc" | "desc") },
              ]}
            />
            <AdvancedFilterPanel filters={advancedFilters} onFiltersChange={setAdvancedFilters} availableFields={PROGRAM_FILTER_FIELDS} onApply={handleAdvancedFilterApply} onReset={handleAdvancedFilterReset} isLoading={loading} />
          </div>
          <div className="dh-filters-mobile-bar">
            <button className={`btn btn--secondary dh-btn dh-filters-toggle ${showFiltersMobile ? "dh-filters-toggle--active" : ""}`} type="button" onClick={openMobileFilters} aria-expanded={showFiltersMobile} aria-controls="program-filters-mobile-panel">
              <span className="dh-filters-toggle__label">Filter</span>
            </button>
          </div>
        </div>

        {success && <Card><p className="alert alert--success dh-alert">{success}</p></Card>}
        {error && <Card><p className="alert alert--error dh-alert">{error}</p></Card>}

        <BulkActionsToolbar selectedCount={selectedPrograms.size} onDelete={handleBulkDelete} onExport={() => handleBulkExport('csv')} onDeselectAll={() => setSelectedPrograms(new Set())} isLoading={isProcessingBulk} />

        {loading ? (
          <Card className="card--table desktop-only dh-table-wrap">
            <div className="program-skeleton-table" aria-hidden>
              <div className="program-skeleton-line program-skeleton-line--lg" />
              <div className="program-skeleton-line" />
              <div className="program-skeleton-line program-skeleton-line--sm" />
            </div>
          </Card>
        ) : (
          <Card className="card--table desktop-only dh-table-wrap">
            <Table<ProgramRow> rows={rows} rowKey={(row) => row.id} emptyMessage="No programs found."
              columns={[
                { key: "select", label: <input type="checkbox" checked={selectedPrograms.size === programs.length && programs.length > 0} onChange={toggleSelectAll} aria-label="Select all" />, render: (row) => <input type="checkbox" checked={selectedPrograms.has(row.id)} onChange={() => toggleProgramSelection(row.id)} /> },
                { key: "title", label: "Title", className: "table-cell-strong", render: (row) => <button className="program-title-btn" type="button" onClick={() => handlePreview(row)}>{row.title}</button> },
                { key: "description", label: "Description", render: (row) => <p className="program-description-cell">{row.description || row.summary || "No description."}</p> },
                { key: "actions", label: "Actions", render: (row) => (
                  <div className="table-actions dh-table-actions">
                    <button className="btn btn--secondary btn--sm dh-btn btn--view" type="button" onClick={() => handlePreview(row)}>Preview</button>
                    <button className="btn btn--secondary btn--sm dh-btn btn--edit" type="button" onClick={() => openEdit(row)}>Edit</button>
                    <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>Delete</button>
                  </div>
                )},
              ]}
            />
          </Card>
        )}

        {!loading && (
          <div className="mobile-only programs-mobile-list">
            {rows.length ? rows.map((row) => (
              <article className="program-mobile-item" key={row.id}>
                <button className="program-mobile-item__title" type="button" onClick={() => handlePreview(row)}>{row.title}</button>
                <div className="table-actions program-mobile-item__actions">
                  <button className="btn btn--secondary btn--sm dh-btn btn--edit" type="button" onClick={() => openEdit(row)}>Edit</button>
                  <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>Delete</button>
                </div>
              </article>
            )) : (
              <Card><div className="empty-state"><p className="empty-state__title">No data</p><p className="empty-state__description">No programs found.</p></div></Card>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><button className="modal-close" type="button" onClick={() => setSelected(null)}>X</button><h3 className="modal-title">Program Details</h3></header>
            <div className="post-details">
              {resolveProgramImageUrl(selected.image_url) && <p className="post-details__line"><img src={resolveProgramImageUrl(selected.image_url) || ""} alt="preview" style={{ width: "100%", maxWidth: "360px", borderRadius: "12px" }} /></p>}
              <p className="post-details__line"><strong>Title:</strong> {selected.title}</p>
              <p className="post-details__line"><strong>Slug:</strong> {selected.slug}</p>
              <p className="post-details__line"><strong>Summary:</strong> {selected.summary || "N/A"}</p>
              <p className="post-details__line"><strong>Description:</strong> {selected.description || "N/A"}</p>
              <p className="post-details__line"><strong>Requirements:</strong> {selected.requirements || "N/A"}</p>
              <p className="post-details__line"><strong>Default Capacity:</strong> {selected.default_capacity ?? "N/A"}</p>
              <p className="post-details__line"><strong>Created At:</strong> {formatDateTime(selected.created_at)}</p>
              <p className="post-details__line"><strong>Updated At:</strong> {formatDateTime(selected.updated_at)}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => { openEdit(selected); setSelected(null); }}>Edit</button>
              <button className="btn btn--danger" type="button" onClick={() => { setDeleteTarget(selected); setSelected(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {formMode && (
        <div className="modal-overlay" role="presentation" onClick={closeForm}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">{formTitle}</h3></header>
            <div className="form-stack">
              <label className="field">
                <span className="field__label">Program Image Preview</span>
                <div style={{ minHeight: "132px", display: "flex", alignItems: "center" }}>
                  {formImageSrc && !imagePreviewFailed ? <img src={formImageSrc} alt="preview" onError={() => setImagePreviewFailed(true)} style={{ width: "100%", maxWidth: "380px", borderRadius: "12px" }} /> : <span className="dh-field-help">No image selected.</span>}
                </div>
              </label>
              <label className="field">
                <span className="field__label">Upload Image</span>
                <input className="field__control" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(e) => void handleProgramImageSelect(e)} disabled={isSubmitting || isUploadingImage} />
              </label>
              <label className="field"><span className="field__label">Image URL</span><input className="field__control" type="url" value={form.imageUrl} onChange={(e) => setForm((c) => ({ ...c, imageUrl: e.target.value }))} placeholder="https://..." disabled={isSubmitting || isUploadingImage} /></label>
              <label className="field"><span className="field__label">Title</span><input className="field__control" type="text" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} /></label>
              <label className="field"><span className="field__label">Slug</span><input className="field__control" type="text" autoComplete="off" value={form.slug} onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value }))} placeholder="Leave blank to auto-generate" /></label>
              <label className="field"><span className="field__label">Summary</span><textarea className="textarea-control" value={form.summary} onChange={(e) => setForm((c) => ({ ...c, summary: e.target.value }))} /></label>
              <label className="field"><span className="field__label">Description</span><RichTextEditor value={form.description} onChange={(content) => setForm((c) => ({ ...c, description: content }))} placeholder="Enter description..." disabled={isSubmitting || isUploadingImage} /></label>
              <label className="field"><span className="field__label">Requirements</span><textarea className="textarea-control" value={form.requirements} onChange={(e) => setForm((c) => ({ ...c, requirements: e.target.value }))} /></label>
              <label className="field"><span className="field__label">Default Capacity</span><input className="field__control" type="number" min={0} step={1} value={form.defaultCapacity} onChange={(e) => setForm((c) => ({ ...c, defaultCapacity: e.target.value }))} /></label>
              <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid var(--tg-border-color)" }} />
              <label className="field"><span className="field__label"><input type="checkbox" checked={form.featured} onChange={(e) => setForm((c) => ({ ...c, featured: e.target.checked }))} style={{ marginRight: "8px" }} />Featured Program</span><span className="dh-field-help">Display in featured section on homepage.</span></label>
              {form.featured && <label className="field"><span className="field__label">Featured Rank</span><input className="field__control" type="number" min={0} value={form.featuredRank} onChange={(e) => setForm((c) => ({ ...c, featuredRank: e.target.value }))} placeholder="0" /></label>}
              <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid var(--tg-border-color)" }} />
              <label className="field"><span className="field__label">SEO Title</span><input className="field__control" type="text" value={form.metaTitle} onChange={(e) => setForm((c) => ({ ...c, metaTitle: e.target.value }))} maxLength={60} placeholder="Max 60 chars" /></label>
              <label className="field"><span className="field__label">SEO Description</span><textarea className="textarea-control" value={form.metaDescription} onChange={(e) => setForm((c) => ({ ...c, metaDescription: e.target.value }))} maxLength={160} placeholder="Max 160 chars" style={{ resize: "vertical", minHeight: "80px" }} /></label>
              <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid var(--tg-border-color)" }} />
              <div className="field"><ImageUpload value={form.featuredImageUrl} onChange={(url) => setForm((c) => ({ ...c, featuredImageUrl: url }))} label="Featured Image" hint="Upload or paste URL" previewLabel="Preview" disabled={isSubmitting || isUploadingImage} /></div>
            </div>
            {formError && <ValidationMessage type="error" message={formError} dismissible onDismiss={() => setFormError("")} />}
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closeForm} disabled={isSubmitting || isUploadingImage}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={handleSave} disabled={isSubmitting || isUploadingImage}>{isSubmitting ? "Saving..." : isUploadingImage ? "Processing..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="presentation" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">Delete Program</h3></header>
            <p className="post-details__line">Delete <strong>{deleteTarget.title}</strong>? This is permanent.</p>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</button>
              <button className="btn btn--danger" type="button" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {showFiltersMobile && (
        <div className="dh-filter-modal" role="presentation" onClick={closeMobileFilters}>
          <div id="program-filters-mobile-panel" className={`dh-filter-sheet ${isFilterDragging ? "dh-filter-sheet--dragging" : ""}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ transform: `translateY(${filterSheetOffset}px)` }}>
            <div className="dh-filter-sheet__drag" onPointerDown={handleFilterDragStart}><span className="dh-filter-sheet__grabber" aria-hidden /><p className="dh-filter-sheet__title">Filters</p></div>
            <FilterBar className="dh-form-grid dh-form-grid--mobile" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search program title"
              selects={[
                { label: "Sort By", value: sortBy, options: [{ label: "Last Updated", value: "updated_at" }, { label: "Created Date", value: "created_at" }, { label: "Title", value: "title" }], onChange: (v) => setSortBy(v as "updated_at" | "created_at" | "title") },
                { label: "Sort Order", value: sortOrder, options: [{ label: "Descending", value: "desc" }, { label: "Ascending", value: "asc" }], onChange: (v) => setSortOrder(v as "asc" | "desc") },
              ]}
            />
          </div>
        </div>
      )}

      <QuickPreviewPanel isOpen={!!previewProgram} title={previewProgram?.title || ""} fields={getPreviewFields()} onClose={() => setPreviewProgram(null)} />
    </PageShell>
  );
}
