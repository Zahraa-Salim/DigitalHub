import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { API_URL, ApiError, api, apiList, type PaginationMeta } from "../../utils/api";
import { getUser, isSuperAdminUser } from "../../utils/auth";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";
import { Filters } from "./profiles-shared/Filters";
import { SearchBar } from "./profiles-shared/SearchBar";
import { StatusPanel } from "./profiles-shared/StatusPanel";

type ManagerRow = {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  skills: string | null;
  admin_role: "admin" | "super_admin";
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  sort_order: number;
  is_public: boolean;
  created_at: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
};

type ManagerFormState = {
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  bio: string;
  job_title: string;
  skills: string;
  admin_role: "admin" | "super_admin";
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  sort_order: string;
};

const defaultPagination: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };

function asText(value: string | null | undefined): string {
  return String(value ?? "").trim() || "Not set";
}

function toInitials(fullName: string | null | undefined): string {
  const source = String(fullName || "").trim();
  if (!source) return "MG";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[1]?.charAt(0) ?? "" : parts[0]?.charAt(1) ?? "";
  const initials = `${first}${second}`.trim();
  return initials ? initials.toUpperCase() : "MG";
}

function toFormState(row: ManagerRow): ManagerFormState {
  return {
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    avatar_url: row.avatar_url ?? "",
    bio: row.bio ?? "",
    job_title: row.job_title ?? "",
    skills: row.skills ?? "",
    admin_role: row.admin_role ?? "admin",
    linkedin_url: row.linkedin_url ?? "",
    github_url: row.github_url ?? "",
    portfolio_url: row.portfolio_url ?? "",
    sort_order: String(Number(row.sort_order ?? 0)),
  };
}

function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
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

export function ProfilesManagersPage() {
  const currentUser = getUser();
  const canManageRoleFields = isSuperAdminUser(currentUser);

  const [rows, setRows] = useState<ManagerRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "full_name" | "sort_order">("sort_order");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(1);

  const [editTarget, setEditTarget] = useState<ManagerRow | null>(null);
  const [editForm, setEditForm] = useState<ManagerFormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editAvatarLoadFailed, setEditAvatarLoadFailed] = useState(false);

  const [details, setDetails] = useState<ManagerRow | null>(null);
  const [detailsAvatarLoadFailed, setDetailsAvatarLoadFailed] = useState(false);

  const [toggleVisibilityTarget, setToggleVisibilityTarget] = useState<ManagerRow | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  const pushToast = useCallback((tone: "success" | "error", message: string) => {
    const id = toastIdRef.current += 1;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3200);
  }, []);

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
        const result = await apiList<ManagerRow>(
          `/profiles/managers${buildQueryString({
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
        const message = err instanceof ApiError ? err.message : "Failed to load managers.";
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
  }, [page, debouncedSearch, visibility, status, sortBy, sortOrder, refreshKey, pushToast]);

  const publicCount = useMemo(() => rows.filter((item) => item.is_public).length, [rows]);
  const activeCount = useMemo(() => rows.filter((item) => item.is_active).length, [rows]);
  const totalPagesSafe = Math.max(1, pagination.totalPages);

  const editAvatarSrc = useMemo(() => resolveAvatarUrl(editForm?.avatar_url ?? null), [editForm?.avatar_url]);
  const editAvatarInitials = useMemo(() => toInitials(editForm?.full_name), [editForm?.full_name]);
  const detailsAvatarSrc = useMemo(() => resolveAvatarUrl(details?.avatar_url ?? null), [details?.avatar_url]);
  const detailsAvatarInitials = useMemo(() => toInitials(details?.full_name), [details?.full_name]);

  useEffect(() => {
    setEditAvatarLoadFailed(false);
  }, [editAvatarSrc]);

  useEffect(() => {
    setDetailsAvatarLoadFailed(false);
  }, [detailsAvatarSrc, details?.user_id]);

  const submitEdit = async () => {
    if (!editTarget || !editForm) return;
    if (!editForm.full_name.trim()) {
      pushToast("error", "Full name is required.");
      return;
    }

    const payload: Record<string, unknown> = {};
    const normalize = (value: string) => value.trim();
    const setIfChanged = (key: string, nextValue: string, prevValue: string | null | undefined) => {
      const normalizedNext = normalize(nextValue);
      const normalizedPrev = normalize(String(prevValue ?? ""));
      if (normalizedNext !== normalizedPrev) {
        payload[key] = normalizedNext;
      }
    };

    setIfChanged("full_name", editForm.full_name, editTarget.full_name);
    setIfChanged("email", editForm.email, editTarget.email);
    setIfChanged("phone", editForm.phone, editTarget.phone);
    setIfChanged("job_title", editForm.job_title, editTarget.job_title);
    setIfChanged("skills", editForm.skills, editTarget.skills);
    setIfChanged("bio", editForm.bio, editTarget.bio);
    setIfChanged("avatar_url", editForm.avatar_url, editTarget.avatar_url);
    setIfChanged("linkedin_url", editForm.linkedin_url, editTarget.linkedin_url);
    setIfChanged("github_url", editForm.github_url, editTarget.github_url);
    setIfChanged("portfolio_url", editForm.portfolio_url, editTarget.portfolio_url);

    const parsedSortOrder = Number(editForm.sort_order);
    if (Number.isFinite(parsedSortOrder) && parsedSortOrder !== Number(editTarget.sort_order ?? 0) && canManageRoleFields) {
      payload.sort_order = Math.trunc(parsedSortOrder);
    }
    if (editForm.admin_role !== editTarget.admin_role && canManageRoleFields) {
      payload.admin_role = editForm.admin_role;
    }

    if (!Object.keys(payload).length) {
      pushToast("error", "No changes to save.");
      return;
    }

    setSavingEdit(true);
    try {
      await api(`/profiles/managers/${editTarget.user_id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setEditTarget(null);
      setEditForm(null);
      setRefreshKey((value) => value + 1);
      pushToast("success", "Manager profile updated.");
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to update manager profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  const runVisibilityToggle = async () => {
    if (!toggleVisibilityTarget) return;
    setSavingAction(true);
    try {
      await api(`/profiles/managers/${toggleVisibilityTarget.user_id}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ is_public: !toggleVisibilityTarget.is_public }),
      });
      setToggleVisibilityTarget(null);
      setRefreshKey((value) => value + 1);
      pushToast("success", "Manager visibility updated.");
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to update manager visibility.");
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <PageShell title="Managers" subtitle="Manage team/admin profiles shown on public pages.">
      <section className="students-layout">
        <StatusPanel
          title="Manager Profiles Hub"
          subtitle="Edit manager/admin profile data, public visibility, and profile links."
          badges={[
            { tone: "public", label: `${publicCount} public` },
            { tone: "resolved", label: `${activeCount} active` },
            { tone: "default", label: `${pagination.total} total` },
          ]}
        />

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search manager name, job title, or skills"
          ariaLabel="Search manager name, job title, or skills"
        />

        <Filters
          selects={[
            {
              label: "Visibility",
              value: visibility,
              options: [
                { label: "All", value: "all" },
                { label: "Public", value: "public" },
                { label: "Private", value: "private" },
              ],
              onChange: (value) => setVisibility(value as "all" | "public" | "private"),
            },
            {
              label: "Status",
              value: status,
              options: [
                { label: "All", value: "all" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ],
              onChange: (value) => setStatus(value as "all" | "active" | "inactive"),
            },
            {
              label: "Sort By",
              value: sortBy,
              options: [
                { label: "Sort Order", value: "sort_order" },
                { label: "Newest", value: "created_at" },
                { label: "Name", value: "full_name" },
              ],
              onChange: (value) => setSortBy(value as "created_at" | "full_name" | "sort_order"),
            },
            {
              label: "Order",
              value: sortOrder,
              options: [
                { label: "Ascending", value: "asc" },
                { label: "Descending", value: "desc" },
              ],
              onChange: (value) => setSortOrder(value as "asc" | "desc"),
            },
          ]}
        />

        {error ? (
          <section className="students-feedback">
            <p className="alert alert--error">{error}</p>
          </section>
        ) : null}

        {loading ? (
          <section className="students-feedback">
            <div className="spinner">Loading managers...</div>
          </section>
        ) : (
          <>
            <Card className="card--table dh-table-wrap">
              <Table<ManagerRow>
                rows={rows}
                rowKey={(row) => row.user_id}
                emptyMessage="No managers found."
                columns={[
                  {
                    key: "name",
                    label: "Name",
                    className: "table-cell-strong",
                    render: (row) => (
                      <button className="program-title-btn" type="button" onClick={() => setDetails(row)}>
                        {row.full_name}
                      </button>
                    ),
                  },
                  { key: "job", label: "Job Title", render: (row) => asText(row.job_title) },
                  { key: "skills", label: "Skills", render: (row) => asText(row.skills) },
                  {
                    key: "role",
                    label: "Role",
                    render: (row) => <Badge tone="default">{row.admin_role === "super_admin" ? "super admin" : "admin"}</Badge>,
                  },
                  {
                    key: "visibility",
                    label: "Visibility",
                    render: (row) => <Badge tone={row.is_public ? "public" : "private"}>{row.is_public ? "public" : "private"}</Badge>,
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (row) => <Badge tone={row.is_active ? "resolved" : "draft"}>{row.is_active ? "active" : "inactive"}</Badge>,
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    render: (row) => (
                      <div className="table-actions">
                        <button
                          className="btn btn--secondary btn--sm btn--edit"
                          type="button"
                          onClick={() => {
                            setEditTarget(row);
                            setEditForm(toFormState(row));
                          }}
                        >
                          Edit
                        </button>
                        <button className="btn btn--primary btn--sm" type="button" onClick={() => setToggleVisibilityTarget(row)}>
                          {row.is_public ? "Toggle Private" : "Toggle Public"}
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            {pagination.total > 0 ? (
              <section className="students-pagination">
                <Pagination page={pagination.page} totalPages={totalPagesSafe} onChange={setPage} />
              </section>
            ) : null}
          </>
        )}
      </section>

      {editTarget && editForm ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={() => !savingEdit && (setEditTarget(null), setEditForm(null))}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">Edit Manager</h3></header>
            <div className="profile-modal-sections">
              <section className="profile-modal-section">
                <h4 className="section-title">Identity</h4>
                <div className="form-stack">
                  <label className="field"><span className="field__label">Full Name</span><input className="field__control" value={editForm.full_name} onChange={(event) => setEditForm((current) => current ? { ...current, full_name: event.target.value } : current)} /></label>
                  <label className="field"><span className="field__label">Email</span><input className="field__control" type="email" value={editForm.email} onChange={(event) => setEditForm((current) => current ? { ...current, email: event.target.value } : current)} /></label>
                  <label className="field"><span className="field__label">Phone</span><input className="field__control" value={editForm.phone} onChange={(event) => setEditForm((current) => current ? { ...current, phone: event.target.value } : current)} /></label>
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
                        alt="Manager avatar preview"
                        onError={() => setEditAvatarLoadFailed(true)}
                      />
                    ) : (
                      <span className="profile-avatar modal-avatar-preview__media" aria-hidden>
                        {editAvatarInitials}
                      </span>
                    )}
                    <p className="modal-avatar-preview__hint">Avatar Preview</p>
                  </div>
                  <label className="field"><span className="field__label">Avatar URL</span><input className="field__control" type="url" value={editForm.avatar_url} onChange={(event) => { setEditAvatarLoadFailed(false); setEditForm((current) => current ? { ...current, avatar_url: event.target.value } : current); }} /></label>
                  <label className="field"><span className="field__label">Job Title</span><input className="field__control" value={editForm.job_title} onChange={(event) => setEditForm((current) => current ? { ...current, job_title: event.target.value } : current)} /></label>
                  <label className="field"><span className="field__label">Skills (comma-separated)</span><textarea className="textarea-control" value={editForm.skills} onChange={(event) => setEditForm((current) => current ? { ...current, skills: event.target.value } : current)} placeholder="Program Management, Community Outreach" /></label>
                  <label className="field"><span className="field__label">Bio</span><textarea className="textarea-control" value={editForm.bio} onChange={(event) => setEditForm((current) => current ? { ...current, bio: event.target.value } : current)} /></label>
                  <label className="field"><span className="field__label">LinkedIn URL</span><input className="field__control" type="url" value={editForm.linkedin_url} onChange={(event) => setEditForm((current) => current ? { ...current, linkedin_url: event.target.value } : current)} /></label>
                  <label className="field"><span className="field__label">GitHub URL</span><input className="field__control" type="url" value={editForm.github_url} onChange={(event) => setEditForm((current) => current ? { ...current, github_url: event.target.value } : current)} /></label>
                  <label className="field"><span className="field__label">Portfolio URL</span><input className="field__control" type="url" value={editForm.portfolio_url} onChange={(event) => setEditForm((current) => current ? { ...current, portfolio_url: event.target.value } : current)} /></label>
                  <label className="field"><span className="field__label">Sort Order</span><input className="field__control" type="number" value={editForm.sort_order} onChange={(event) => setEditForm((current) => current ? { ...current, sort_order: event.target.value } : current)} disabled={!canManageRoleFields} /></label>
                  <label className="field"><span className="field__label">Role</span>
                    <select className="field__control" value={editForm.admin_role} onChange={(event) => setEditForm((current) => current ? { ...current, admin_role: event.target.value as "admin" | "super_admin" } : current)} disabled={!canManageRoleFields}>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </label>
                </div>
              </section>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => { setEditTarget(null); setEditForm(null); }} disabled={savingEdit}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={() => void submitEdit()} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {details ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={() => setDetails(null)}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">Manager Details</h3></header>
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
              <p className="post-details__line"><strong>Job Title:</strong> {asText(details.job_title)}</p>
              <p className="post-details__line"><strong>Skills:</strong> {asText(details.skills)}</p>
              <p className="post-details__line"><strong>Bio:</strong> {asText(details.bio)}</p>
              <p className="post-details__line"><strong>Avatar URL:</strong> {asText(details.avatar_url)}</p>
              <p className="post-details__line"><strong>LinkedIn:</strong> {asText(details.linkedin_url)}</p>
              <p className="post-details__line"><strong>GitHub:</strong> {asText(details.github_url)}</p>
              <p className="post-details__line"><strong>Portfolio:</strong> {asText(details.portfolio_url)}</p>
              <p className="post-details__line"><strong>Role:</strong> {details.admin_role === "super_admin" ? "Super Admin" : "Admin"}</p>
              <p className="post-details__line"><strong>Sort Order:</strong> {Number(details.sort_order ?? 0)}</p>
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
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">{toggleVisibilityTarget.is_public ? "Toggle To Private" : "Toggle To Public"}</h3></header>
            <p className="post-details__line">Confirm visibility change for <strong>{toggleVisibilityTarget.full_name}</strong>?</p>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setToggleVisibilityTarget(null)} disabled={savingAction}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={() => void runVisibilityToggle()} disabled={savingAction}>{savingAction ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </PageShell>
  );
}
