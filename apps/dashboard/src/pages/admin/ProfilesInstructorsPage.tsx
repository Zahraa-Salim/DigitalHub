import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { API_URL, ApiError, api, apiList, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";

type InstructorRow = {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  expertise: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  is_public: boolean;
  created_at: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
};

type InstructorFormState = {
  full_name: string;
  email: string;
  phone: string;
  expertise: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  is_public: boolean;
};

const defaultPagination: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };
const initialForm: InstructorFormState = {
  full_name: "",
  email: "",
  phone: "",
  expertise: "",
  bio: "",
  avatar_url: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  is_public: false,
};

function asText(value: string | null | undefined): string {
  return String(value ?? "").trim() || "Not set";
}

function toFormState(row: InstructorRow): InstructorFormState {
  return {
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    expertise: row.expertise ?? "",
    bio: row.bio ?? "",
    avatar_url: row.avatar_url ?? "",
    linkedin_url: row.linkedin_url ?? "",
    github_url: row.github_url ?? "",
    portfolio_url: row.portfolio_url ?? "",
    is_public: Boolean(row.is_public),
  };
}

function toInitials(fullName: string | null | undefined): string {
  const source = String(fullName || "").trim();
  if (!source) {
    return "IN";
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "IN";
  }
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[1]?.charAt(0) ?? "" : parts[0]?.charAt(1) ?? "";
  const initials = `${first}${second}`.trim();
  return initials ? initials.toUpperCase() : "IN";
}

function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) {
    return null;
  }
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://") || avatarUrl.startsWith("data:")) {
    return avatarUrl;
  }
  const normalizedPath = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
  try {
    const api = new URL(API_URL);
    return `${api.origin}${normalizedPath}`;
  } catch {
    return `${API_URL.replace(/\/$/, "")}${normalizedPath}`;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function parseImageDataUrl(value: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(value);
  if (!match) {
    return null;
  }
  return { mimeType: match[1].toLowerCase(), base64: match[2] };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to process image."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function shrinkImageToLimit(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) {
    return file;
  }

  const dataUrl = await fileToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Invalid image file."));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to process image.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const candidates: Array<{ type: string; quality: number }> = [
    { type: "image/webp", quality: 0.86 },
    { type: "image/jpeg", quality: 0.84 },
    { type: "image/jpeg", quality: 0.72 },
    { type: "image/jpeg", quality: 0.62 },
  ];

  for (const candidate of candidates) {
    const blob = await canvasToBlob(canvas, candidate.type, candidate.quality);
    if (blob.size <= maxBytes) {
      const extension = candidate.type === "image/webp" ? "webp" : "jpg";
      return new File([blob], `avatar.${extension}`, { type: candidate.type });
    }
  }

  throw new Error("Image is too large. Use a smaller image (max 2MB).");
}

export function ProfilesInstructorsPage() {
  const [rows, setRows] = useState<InstructorRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "full_name" | "user_id">("created_at");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const [toastId, setToastId] = useState(1);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<InstructorFormState>(initialForm);
  const [creating, setCreating] = useState(false);
  const [createAvatarUploading, setCreateAvatarUploading] = useState(false);
  const [createAvatarLoadFailed, setCreateAvatarLoadFailed] = useState(false);

  const [editTarget, setEditTarget] = useState<InstructorRow | null>(null);
  const [editForm, setEditForm] = useState<InstructorFormState>(initialForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editAvatarUploading, setEditAvatarUploading] = useState(false);
  const [editAvatarLoadFailed, setEditAvatarLoadFailed] = useState(false);

  const [details, setDetails] = useState<InstructorRow | null>(null);
  const [detailsAvatarLoadFailed, setDetailsAvatarLoadFailed] = useState(false);
  const [toggleVisibilityTarget, setToggleVisibilityTarget] = useState<InstructorRow | null>(null);
  const [activationTarget, setActivationTarget] = useState<InstructorRow | null>(null);
  const [activationNext, setActivationNext] = useState<boolean | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  const pushToast = (tone: "success" | "error", message: string) => {
    const id = toastId;
    setToastId((current) => current + 1);
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3200);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, visibility, status, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiList<InstructorRow>(
          `/profiles/instructors${buildQueryString({
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            is_public: visibility === "all" ? undefined : visibility === "public",
            is_active: status === "all" ? undefined : status === "active",
            sortBy,
            order: sortOrder,
          })}`,
        );
        if (!active) return;
        setRows(result.data);
        setPagination(result.pagination);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : "Failed to load instructors.";
        setError(message);
        pushToast("error", message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, visibility, status, sortBy, sortOrder, refreshKey]);

  const publicCount = useMemo(() => rows.filter((row) => row.is_public).length, [rows]);
  const activeCount = useMemo(() => rows.filter((row) => row.is_active).length, [rows]);
  const totalPagesSafe = Math.max(1, pagination.totalPages);
  const createAvatarSrc = useMemo(() => resolveAvatarUrl(createForm.avatar_url || null), [createForm.avatar_url]);
  const createAvatarInitials = useMemo(() => toInitials(createForm.full_name), [createForm.full_name]);
  const editAvatarSrc = useMemo(() => resolveAvatarUrl(editForm.avatar_url || null), [editForm.avatar_url]);
  const editAvatarInitials = useMemo(() => toInitials(editForm.full_name), [editForm.full_name]);
  const detailsAvatarSrc = useMemo(() => resolveAvatarUrl(details?.avatar_url ?? null), [details?.avatar_url]);
  const detailsAvatarInitials = useMemo(() => toInitials(details?.full_name), [details?.full_name]);

  useEffect(() => {
    setCreateAvatarLoadFailed(false);
  }, [createAvatarSrc]);

  useEffect(() => {
    setEditAvatarLoadFailed(false);
  }, [editAvatarSrc]);

  useEffect(() => {
    setDetailsAvatarLoadFailed(false);
  }, [detailsAvatarSrc, details?.user_id]);

  const uploadAvatarFromDataUrl = async (dataUrl: string): Promise<string> => {
    const parsed = parseImageDataUrl(dataUrl);
    if (!parsed) {
      throw new Error("Invalid avatar image data. Please re-select the image.");
    }

    const uploaded = await api<{ avatar_url: string }>("/profiles/instructors/avatar", {
      method: "POST",
      body: JSON.stringify({
        filename: "instructor-avatar",
        mime_type: parsed.mimeType,
        data_base64: parsed.base64,
      }),
    });

    return uploaded.avatar_url;
  };

  const submitCreate = async () => {
    if (!createForm.full_name.trim()) return pushToast("error", "Full name is required.");
    if (!createForm.email.trim() && !createForm.phone.trim()) return pushToast("error", "Email or phone is required.");

    setCreating(true);
    try {
      const payload: InstructorFormState = { ...createForm };
      if (payload.avatar_url.startsWith("data:image/")) {
        payload.avatar_url = await uploadAvatarFromDataUrl(payload.avatar_url);
        setCreateForm((current) => ({ ...current, avatar_url: payload.avatar_url }));
      }

      await api("/profiles/instructors", { method: "POST", body: JSON.stringify(payload) });
      setCreateOpen(false);
      setCreateForm(initialForm);
      setCreateAvatarLoadFailed(false);
      setRefreshKey((v) => v + 1);
      pushToast("success", "Instructor created in users + instructor_profiles.");
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to create instructor.");
    } finally {
      setCreating(false);
    }
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    if (!editForm.full_name.trim()) return pushToast("error", "Full name is required.");

    setSavingEdit(true);
    try {
      const payload: InstructorFormState = { ...editForm };
      if (payload.avatar_url.startsWith("data:image/")) {
        payload.avatar_url = await uploadAvatarFromDataUrl(payload.avatar_url);
        setEditForm((current) => ({ ...current, avatar_url: payload.avatar_url }));
      }

      await api(`/profiles/instructors/${editTarget.user_id}`, { method: "PATCH", body: JSON.stringify(payload) });
      setEditTarget(null);
      setEditAvatarLoadFailed(false);
      setRefreshKey((v) => v + 1);
      pushToast("success", "Instructor profile updated.");
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to update instructor.");
    } finally {
      setSavingEdit(false);
    }
  };

  const runVisibilityToggle = async () => {
    if (!toggleVisibilityTarget) return;
    setSavingAction(true);
    try {
      await api(`/profiles/instructors/${toggleVisibilityTarget.user_id}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ is_public: !toggleVisibilityTarget.is_public }),
      });
      setToggleVisibilityTarget(null);
      setRefreshKey((v) => v + 1);
      pushToast("success", "Instructor visibility updated.");
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to update visibility.");
    } finally {
      setSavingAction(false);
    }
  };

  const runActivation = async () => {
    if (!activationTarget || activationNext === null) return;
    setSavingAction(true);
    try {
      await api(`/profiles/instructors/${activationTarget.user_id}/${activationNext ? "activate" : "deactivate"}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setActivationTarget(null);
      setActivationNext(null);
      setRefreshKey((v) => v + 1);
      pushToast("success", `Instructor ${activationNext ? "activated" : "deactivated"} successfully.`);
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to update instructor status.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleCreateAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      pushToast("error", "Only JPG, PNG, and WEBP files are allowed.");
      return;
    }

    setCreateAvatarUploading(true);
    try {
      file = await shrinkImageToLimit(file, 2 * 1024 * 1024);
      const dataUrl = await fileToDataUrl(file);
      setCreateForm((current) => ({ ...current, avatar_url: dataUrl }));
      setCreateAvatarLoadFailed(false);
      pushToast("success", "Avatar ready. Save instructor to upload.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to process avatar.");
    } finally {
      setCreateAvatarUploading(false);
    }
  };

  const handleEditAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      pushToast("error", "Only JPG, PNG, and WEBP files are allowed.");
      return;
    }

    setEditAvatarUploading(true);
    try {
      file = await shrinkImageToLimit(file, 2 * 1024 * 1024);
      const dataUrl = await fileToDataUrl(file);
      setEditForm((current) => ({ ...current, avatar_url: dataUrl }));
      setEditAvatarLoadFailed(false);
      pushToast("success", "Avatar ready. Save changes to upload.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to process avatar.");
    } finally {
      setEditAvatarUploading(false);
    }
  };

  return (
    <PageShell
      title="Instructors"
      subtitle="Maintain instructor profile quality, visibility, and account status."
      actions={
        <button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={() => setCreateOpen(true)}>
          Add Instructor
        </button>
      }
    >
      <Card className="instructors-hero">
        <div>
          <h3 className="section-title">Instructor Profiles Hub</h3>
          <p className="info-text">Manage profiles, visibility, and activation from one panel.</p>
        </div>
        <div className="profile-badges">
          <Badge tone="public">{`${publicCount} public`}</Badge>
          <Badge tone="resolved">{`${activeCount} active`}</Badge>
          <Badge tone="default">{`${pagination.total} total`}</Badge>
        </div>
      </Card>

      <FilterBar
        className="dh-form-grid dh-form-grid--compact filters-grid--5"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search instructor name or expertise"
        selects={[
          {
            label: "Visibility",
            value: visibility,
            options: [
              { label: "All", value: "all" },
              { label: "Public", value: "public" },
              { label: "Private", value: "private" },
            ],
            onChange: (v) => setVisibility(v as "all" | "public" | "private"),
          },
          {
            label: "Status",
            value: status,
            options: [
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
            onChange: (v) => setStatus(v as "all" | "active" | "inactive"),
          },
          {
            label: "Sort By",
            value: sortBy,
            options: [
              { label: "Newest", value: "created_at" },
              { label: "Name", value: "full_name" },
              { label: "User ID", value: "user_id" },
            ],
            onChange: (v) => setSortBy(v as "created_at" | "full_name" | "user_id"),
          },
          {
            label: "Order",
            value: sortOrder,
            options: [
              { label: "Descending", value: "desc" },
              { label: "Ascending", value: "asc" },
            ],
            onChange: (v) => setSortOrder(v as "desc" | "asc"),
          },
        ]}
      />

      {error ? (
        <Card>
          <p className="alert alert--error">{error}</p>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <div className="spinner">Loading instructors...</div>
        </Card>
      ) : (
        <>
          <Card className="card--table dh-table-wrap">
            <Table<InstructorRow>
              rows={rows}
              rowKey={(r) => r.user_id}
              emptyMessage="No instructors found."
              columns={[
                {
                  key: "name",
                  label: "Name",
                  className: "table-cell-strong",
                  render: (r) => (
                    <button className="program-title-btn" type="button" onClick={() => setDetails(r)}>
                      {r.full_name}
                    </button>
                  ),
                },
                { key: "expertise", label: "Expertise", render: (r) => asText(r.expertise) },
                {
                  key: "visibility",
                  label: "Visibility",
                  render: (r) => <Badge tone={r.is_public ? "public" : "private"}>{r.is_public ? "public" : "private"}</Badge>,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (r) => <Badge tone={r.is_active ? "resolved" : "draft"}>{r.is_active ? "active" : "inactive"}</Badge>,
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (r) => (
                    <div className="table-actions">
                      <button className="btn btn--secondary btn--sm btn--edit" type="button" onClick={() => { setEditTarget(r); setEditForm(toFormState(r)); }}>
                        Edit
                      </button>
                      <button className="btn btn--primary btn--sm" type="button" onClick={() => setToggleVisibilityTarget(r)}>
                        {r.is_public ? "Toggle Private" : "Toggle Public"}
                      </button>
                      {r.is_active ? (
                        <button className="btn btn--danger btn--sm" type="button" onClick={() => { setActivationTarget(r); setActivationNext(false); }}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="btn btn--primary btn--sm" type="button" onClick={() => { setActivationTarget(r); setActivationNext(true); }}>
                          Activate
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          {pagination.total > 0 ? (
            <Card>
              <Pagination page={pagination.page} totalPages={totalPagesSafe} onChange={setPage} />
            </Card>
          ) : null}
        </>
      )}

      {createOpen ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={() => !creating && !createAvatarUploading && setCreateOpen(false)}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">Add Instructor</h3></header>
            <div className="profile-modal-sections">
              <section className="profile-modal-section">
                <h4 className="section-title">Identity</h4>
                <div className="form-stack">
                  <label className="field"><span className="field__label">Full Name</span><input className="field__control" value={createForm.full_name} onChange={(e) => setCreateForm((c) => ({ ...c, full_name: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Email</span><input className="field__control" type="email" value={createForm.email} onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Phone</span><input className="field__control" value={createForm.phone} onChange={(e) => setCreateForm((c) => ({ ...c, phone: e.target.value }))} /></label>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Profile</h4>
                <div className="form-stack">
                  <div className="modal-avatar-preview" aria-live="polite">
                    {createAvatarSrc && !createAvatarLoadFailed ? (
                      <img
                        className="profile-avatar profile-avatar--image modal-avatar-preview__media"
                        src={createAvatarSrc}
                        alt="Instructor avatar preview"
                        onError={() => setCreateAvatarLoadFailed(true)}
                      />
                    ) : (
                      <span className="profile-avatar modal-avatar-preview__media" aria-hidden>
                        {createAvatarInitials}
                      </span>
                    )}
                    <p className="modal-avatar-preview__hint">Avatar Preview</p>
                  </div>
                  <label className="field"><span className="field__label">Expertise</span><input className="field__control" value={createForm.expertise} onChange={(e) => setCreateForm((c) => ({ ...c, expertise: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Avatar Upload</span><input className="field__control" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(event) => void handleCreateAvatarUpload(event)} disabled={createAvatarUploading || creating} /></label>
                  <label className="field"><span className="field__label">Avatar URL</span><input className="field__control" type="url" value={createForm.avatar_url} onChange={(e) => { setCreateAvatarLoadFailed(false); setCreateForm((c) => ({ ...c, avatar_url: e.target.value })); }} /></label>
                  <label className="field"><span className="field__label">Bio</span><textarea className="textarea-control" value={createForm.bio} onChange={(e) => setCreateForm((c) => ({ ...c, bio: e.target.value }))} /></label>
                  <label className="cohort-form-switch"><span className="field__label">Public Profile</span><input className="cohort-form-switch__checkbox" type="checkbox" checked={createForm.is_public} onChange={(e) => setCreateForm((c) => ({ ...c, is_public: e.target.checked }))} /></label>
                </div>
              </section>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setCreateOpen(false)} disabled={creating || createAvatarUploading}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={() => void submitCreate()} disabled={creating || createAvatarUploading}>
                {creating ? "Creating..." : createAvatarUploading ? "Preparing Avatar..." : "Create Instructor"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={() => !savingEdit && !editAvatarUploading && setEditTarget(null)}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">Edit Instructor</h3></header>
            <div className="profile-modal-sections">
              <section className="profile-modal-section">
                <h4 className="section-title">Identity</h4>
                <div className="form-stack">
                  <label className="field"><span className="field__label">Full Name</span><input className="field__control" value={editForm.full_name} onChange={(e) => setEditForm((c) => ({ ...c, full_name: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Email</span><input className="field__control" type="email" value={editForm.email} onChange={(e) => setEditForm((c) => ({ ...c, email: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Phone</span><input className="field__control" value={editForm.phone} onChange={(e) => setEditForm((c) => ({ ...c, phone: e.target.value }))} /></label>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Profile</h4>
                <div className="form-stack">
                  <div className="modal-avatar-preview" aria-live="polite">
                    {editAvatarSrc && !editAvatarLoadFailed ? (
                      <img
                        className="profile-avatar profile-avatar--image modal-avatar-preview__media"
                        src={editAvatarSrc}
                        alt="Instructor avatar preview"
                        onError={() => setEditAvatarLoadFailed(true)}
                      />
                    ) : (
                      <span className="profile-avatar modal-avatar-preview__media" aria-hidden>
                        {editAvatarInitials}
                      </span>
                    )}
                    <p className="modal-avatar-preview__hint">Avatar Preview</p>
                  </div>
                  <label className="field"><span className="field__label">Expertise</span><input className="field__control" value={editForm.expertise} onChange={(e) => setEditForm((c) => ({ ...c, expertise: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Avatar Upload</span><input className="field__control" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(event) => void handleEditAvatarUpload(event)} disabled={editAvatarUploading || savingEdit} /></label>
                  <label className="field"><span className="field__label">Avatar URL</span><input className="field__control" type="url" value={editForm.avatar_url} onChange={(e) => { setEditAvatarLoadFailed(false); setEditForm((c) => ({ ...c, avatar_url: e.target.value })); }} /></label>
                  <label className="field"><span className="field__label">Bio</span><textarea className="textarea-control" value={editForm.bio} onChange={(e) => setEditForm((c) => ({ ...c, bio: e.target.value }))} /></label>
                </div>
              </section>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setEditTarget(null)} disabled={savingEdit || editAvatarUploading}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={() => void submitEdit()} disabled={savingEdit || editAvatarUploading}>
                {savingEdit ? "Saving..." : editAvatarUploading ? "Preparing Avatar..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {details ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={() => setDetails(null)}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">Instructor Details</h3></header>
            <div className="profile-modal-sections">
              <section className="profile-modal-section">
                <div className="modal-avatar-preview" aria-live="polite">
                  {detailsAvatarSrc && !detailsAvatarLoadFailed ? (
                    <img
                      className="profile-avatar profile-avatar--image modal-avatar-preview__media"
                      src={detailsAvatarSrc}
                      alt={`${asText(details.full_name)} avatar`}
                      onError={() => setDetailsAvatarLoadFailed(true)}
                    />
                  ) : (
                    <span className="profile-avatar modal-avatar-preview__media" aria-hidden>
                      {detailsAvatarInitials}
                    </span>
                  )}
                  <p className="modal-avatar-preview__hint">Avatar Preview</p>
                </div>
              </section>
            </div>
            <div className="post-details">
              <p className="post-details__line"><strong>Name:</strong> {asText(details.full_name)}</p>
              <p className="post-details__line"><strong>Email:</strong> {asText(details.email)}</p>
              <p className="post-details__line"><strong>Phone:</strong> {asText(details.phone)}</p>
              <p className="post-details__line"><strong>Expertise:</strong> {asText(details.expertise)}</p>
              <p className="post-details__line"><strong>Bio:</strong> {asText(details.bio)}</p>
              <p className="post-details__line"><strong>Avatar URL:</strong> {asText(details.avatar_url)}</p>
              <p className="post-details__line"><strong>LinkedIn:</strong> {asText(details.linkedin_url)}</p>
              <p className="post-details__line"><strong>GitHub:</strong> {asText(details.github_url)}</p>
              <p className="post-details__line"><strong>Portfolio:</strong> {asText(details.portfolio_url)}</p>
              <p className="post-details__line"><strong>Visibility:</strong> {details.is_public ? "Public" : "Private"}</p>
              <p className="post-details__line"><strong>Status:</strong> {details.is_active ? "Active" : "Inactive"}</p>
              <p className="post-details__line"><strong>Created:</strong> {formatDateTime(details.created_at)}</p>
            </div>
            <div className="modal-actions"><button className="btn btn--primary" type="button" onClick={() => setDetails(null)}>Close</button></div>
          </div>
        </div>
      ) : null}

      {toggleVisibilityTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => !savingAction && setToggleVisibilityTarget(null)}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">{toggleVisibilityTarget.is_public ? "Toggle To Private" : "Toggle To Public"}</h3></header>
            <p className="post-details__line">Confirm visibility change for <strong>{toggleVisibilityTarget.full_name}</strong>?</p>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setToggleVisibilityTarget(null)} disabled={savingAction}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={() => void runVisibilityToggle()} disabled={savingAction}>{savingAction ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {activationTarget && activationNext !== null ? (
        <div className="modal-overlay" role="presentation" onClick={() => !savingAction && (setActivationTarget(null), setActivationNext(null))}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">{activationNext ? "Activate Instructor" : "Deactivate Instructor"}</h3></header>
            <p className="post-details__line">{activationNext ? "Activate" : "Deactivate"} <strong>{activationTarget.full_name}</strong>?</p>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => { setActivationTarget(null); setActivationNext(null); }} disabled={savingAction}>Cancel</button>
              <button className={`btn ${activationNext ? "btn--primary" : "btn--danger"}`} type="button" onClick={() => void runActivation()} disabled={savingAction}>{savingAction ? "Saving..." : activationNext ? "Activate" : "Deactivate"}</button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </PageShell>
  );
}
