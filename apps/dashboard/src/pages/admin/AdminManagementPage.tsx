import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { StatsCard } from "../../components/StatsCard";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { API_URL, ApiError, api, apiList, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";

type AdminRow = {
  user_id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  admin_profile: {
    full_name: string;
    job_title: string | null;
    avatar_url: string | null;
    is_public: boolean;
    sort_order: number;
    admin_role: "admin" | "super_admin";
  };
};

type CreateFormState = {
  email: string;
  password: string;
  full_name: string;
  job_title: string;
  avatar_url: string;
  admin_role: "admin" | "super_admin";
};

const defaultPagination: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };

const initialCreateForm: CreateFormState = {
  email: "",
  password: "",
  full_name: "",
  job_title: "",
  avatar_url: "",
  admin_role: "admin",
};

function toInitials(fullName: string): string {
  const source = String(fullName || "").trim();
  if (!source) {
    return "AD";
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "AD";
  }
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[1]?.charAt(0) ?? "" : parts[0]?.charAt(1) ?? "";
  const initials = `${first}${second}`.trim();
  return initials ? initials.toUpperCase() : "AD";
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

export function AdminManagementPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "super_admin">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "last_login_at" | "email" | "full_name" | "admin_role">("created_at");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createAvatarLoadFailed, setCreateAvatarLoadFailed] = useState(false);

  const [selectedAdmin, setSelectedAdmin] = useState<AdminRow | null>(null);

  const [activationTarget, setActivationTarget] = useState<AdminRow | null>(null);
  const [activationNext, setActivationNext] = useState<boolean | null>(null);
  const [isUpdatingActivation, setIsUpdatingActivation] = useState(false);

  const [toastId, setToastId] = useState(1);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (tone: "success" | "error", message: string) => {
    const id = toastId;
    setToastId((current) => current + 1);
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, activeFilter, sortBy]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiList<AdminRow>(
          `/admins${buildQueryString({
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            role: roleFilter === "all" ? undefined : roleFilter,
            is_active: activeFilter === "all" ? undefined : activeFilter === "true",
            sortBy,
            order: "desc",
          })}`,
        );

        if (!active) {
          return;
        }

        setRows(result.data);
        setPagination(result.pagination);
      } catch (err) {
        if (!active) {
          return;
        }
        const message = err instanceof ApiError ? err.message : "Failed to load admins.";
        setError(message);
        pushToast("error", message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activeFilter, debouncedSearch, page, refreshKey, roleFilter, sortBy]);

  const activeCount = rows.filter((row) => row.is_active).length;
  const superCount = rows.filter((row) => row.admin_profile.admin_role === "super_admin").length;
  const totalPagesSafe = Math.max(pagination.totalPages, 1);
  const createAvatarSrc = useMemo(() => resolveAvatarUrl(createForm.avatar_url.trim() || null), [createForm.avatar_url]);
  const createAvatarInitials = useMemo(() => toInitials(createForm.full_name), [createForm.full_name]);

  useEffect(() => {
    setCreateAvatarLoadFailed(false);
  }, [createAvatarSrc]);

  const openCreateModal = () => {
    setCreateForm(initialCreateForm);
    setCreateAvatarLoadFailed(false);
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setCreateForm(initialCreateForm);
    setCreateAvatarLoadFailed(false);
  };

  const handleCreate = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      pushToast("error", "Email and password are required.");
      return;
    }

    setIsCreating(true);
    try {
      await api<AdminRow>("/admins", {
        method: "POST",
        body: JSON.stringify({
          email: createForm.email.trim().toLowerCase(),
          password: createForm.password,
          full_name: createForm.full_name.trim() || undefined,
          job_title: createForm.job_title.trim() || undefined,
          avatar_url: createForm.avatar_url.trim() || undefined,
          admin_role: createForm.admin_role,
        }),
      });
      closeCreateModal();
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setRefreshKey((current) => current + 1);
      pushToast("success", "Admin created successfully. Created in users + admin_profiles.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create admin.";
      pushToast("error", message);
    } finally {
      setIsCreating(false);
    }
  };

  const openActivationModal = (row: AdminRow, next: boolean) => {
    setActivationTarget(row);
    setActivationNext(next);
  };

  const handleActivation = async () => {
    if (!activationTarget || activationNext === null) {
      return;
    }

    setIsUpdatingActivation(true);
    try {
      await api<AdminRow>(`/admins/${activationTarget.user_id}/${activationNext ? "activate" : "deactivate"}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setActivationTarget(null);
      setActivationNext(null);
      setRefreshKey((current) => current + 1);
      pushToast("success", `Admin ${activationNext ? "activated" : "deactivated"} successfully.`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update admin status.";
      pushToast("error", message);
    } finally {
      setIsUpdatingActivation(false);
    }
  };

  return (
    <PageShell
      title="Admin Management"
      subtitle="Super-admin controls for admin accounts and role assignment."
      actions={
        <button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={openCreateModal}>
          Add Admin
        </button>
      }
    >
      <div className="dh-page">
        <div className="stats-grid stats-grid--compact dh-stats">
          <StatsCard label="Total (Page)" value={String(rows.length)} hint={`Total matching records: ${pagination.total}`} />
          <StatsCard label="Active (Page)" value={String(activeCount)} hint="Currently active admins" />
          <StatsCard label="Super Admins" value={String(superCount)} hint="Role: super_admin" />
        </div>

        <FilterBar
          className="dh-form-grid dh-form-grid--admins filters-grid--4"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search admins"
          selects={[
            {
              label: "Role",
              value: roleFilter,
              options: [
                { label: "All", value: "all" },
                { label: "Admin", value: "admin" },
                { label: "Super Admin", value: "super_admin" },
              ],
              onChange: (value) => setRoleFilter(value as "all" | "admin" | "super_admin"),
            },
            {
              label: "Status",
              value: activeFilter,
              options: [
                { label: "All", value: "all" },
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ],
              onChange: (value) => setActiveFilter(value as "all" | "true" | "false"),
            },
            {
              label: "Sort By",
              value: sortBy,
              options: [
                { label: "Created At", value: "created_at" },
                { label: "Last Login", value: "last_login_at" },
                { label: "Full Name", value: "full_name" },
                { label: "Email", value: "email" },
                { label: "Role", value: "admin_role" },
              ],
              onChange: (value) =>
                setSortBy(value as "created_at" | "last_login_at" | "email" | "full_name" | "admin_role"),
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
            <div className="spinner">Loading admins...</div>
          </Card>
        ) : (
          <>
            <Card className="card--table desktop-only dh-table-wrap">
              <Table<AdminRow>
                rows={rows}
                rowKey={(row) => row.user_id}
                emptyMessage="No admins found."
                columns={[
                  {
                    key: "name",
                    label: "Name",
                    className: "table-cell-strong",
                    render: (row) => (
                      <button className="program-title-btn" type="button" onClick={() => setSelectedAdmin(row)}>
                        {row.admin_profile.full_name || "Admin"}
                      </button>
                    ),
                  },
                  {
                    key: "role",
                    label: "Role",
                    render: (row) => (
                      <Badge tone={row.admin_profile.admin_role === "super_admin" ? "approved" : "default"}>
                        {row.admin_profile.admin_role}
                      </Badge>
                    ),
                  },
                  {
                    key: "public",
                    label: "Public",
                    render: (row) => (
                      <Badge tone={row.admin_profile.is_public ? "resolved" : "draft"}>
                        {row.admin_profile.is_public ? "public" : "private"}
                      </Badge>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (row) => (
                      <Badge tone={row.is_active ? "resolved" : "draft"}>{row.is_active ? "active" : "inactive"}</Badge>
                    ),
                  },
                  {
                    key: "last_login",
                    label: "Last Login",
                    render: (row) => (row.last_login_at ? formatDateTime(row.last_login_at) : "Never"),
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    render: (row) => (
                      <div className="table-actions">
                        {row.is_active ? (
                          <button className="btn btn--danger btn--sm" type="button" onClick={() => openActivationModal(row, false)}>
                            Deactivate
                          </button>
                        ) : (
                          <button className="btn btn--primary btn--sm" type="button" onClick={() => openActivationModal(row, true)}>
                            Activate
                          </button>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            <Card className="mobile-only">
              <div className="list-stack">
                {rows.map((row) => (
                  <div className="program-mobile-item" key={row.user_id}>
                    <button className="program-mobile-item__title" type="button" onClick={() => setSelectedAdmin(row)}>
                      {row.admin_profile.full_name}
                    </button>
                    <div className="program-mobile-item__meta-row">
                      <Badge tone={row.admin_profile.admin_role === "super_admin" ? "approved" : "default"}>
                        {row.admin_profile.admin_role}
                      </Badge>
                      <Badge tone={row.admin_profile.is_public ? "resolved" : "draft"}>
                        {row.admin_profile.is_public ? "public" : "private"}
                      </Badge>
                      <Badge tone={row.is_active ? "resolved" : "draft"}>{row.is_active ? "active" : "inactive"}</Badge>
                    </div>
                    <div className="program-mobile-item__actions">
                      {row.is_active ? (
                        <button className="btn btn--danger btn--sm" type="button" onClick={() => openActivationModal(row, false)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="btn btn--primary btn--sm" type="button" onClick={() => openActivationModal(row, true)}>
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {pagination.total > 0 ? (
              <Card>
                <Pagination page={pagination.page} totalPages={totalPagesSafe} onChange={setPage} />
              </Card>
            ) : null}
          </>
        )}
      </div>

      {showCreate ? (
        <div className="modal-overlay" role="presentation" onClick={closeCreateModal}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Add Admin</h3>
            </header>
            <div className="form-stack">
              <div className="modal-avatar-preview" aria-live="polite">
                {createAvatarSrc && !createAvatarLoadFailed ? (
                  <img
                    className="profile-avatar profile-avatar--image modal-avatar-preview__media"
                    src={createAvatarSrc}
                    alt="Admin avatar preview"
                    onError={() => setCreateAvatarLoadFailed(true)}
                  />
                ) : (
                  <span className="profile-avatar modal-avatar-preview__media" aria-hidden>
                    {createAvatarInitials}
                  </span>
                )}
                <p className="modal-avatar-preview__hint">Avatar Preview</p>
              </div>
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  className="field__control"
                  type="email"
                  autoComplete="off"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Password</span>
                <input
                  className="field__control"
                  type="password"
                  autoComplete="new-password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Full Name</span>
                <input
                  className="field__control"
                  type="text"
                  autoComplete="off"
                  value={createForm.full_name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, full_name: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Job Title</span>
                <input
                  className="field__control"
                  type="text"
                  autoComplete="off"
                  value={createForm.job_title}
                  onChange={(event) => setCreateForm((current) => ({ ...current, job_title: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Avatar URL</span>
                <input
                  className="field__control"
                  type="url"
                  autoComplete="off"
                  value={createForm.avatar_url}
                  onChange={(event) => {
                    setCreateAvatarLoadFailed(false);
                    setCreateForm((current) => ({ ...current, avatar_url: event.target.value }));
                  }}
                />
              </label>
              <label className="field">
                <span className="field__label">Role</span>
                <select
                  className="field__control"
                  value={createForm.admin_role}
                  onChange={(event) => setCreateForm((current) => ({ ...current, admin_role: event.target.value as "admin" | "super_admin" }))}
                >
                  <option value="admin">admin</option>
                  <option value="super_admin">super_admin</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closeCreateModal} disabled={isCreating}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={() => void handleCreate()} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedAdmin ? (
        <div className="modal-overlay" role="presentation" onClick={() => setSelectedAdmin(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Admin Details</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line"><strong>Name:</strong> {selectedAdmin.admin_profile.full_name || "Admin"}</p>
              <p className="post-details__line"><strong>Email:</strong> {selectedAdmin.email || "N/A"}</p>
              <p className="post-details__line"><strong>Job Title:</strong> {selectedAdmin.admin_profile.job_title || "Not set"}</p>
              <p className="post-details__line"><strong>Role:</strong> {selectedAdmin.admin_profile.admin_role}</p>
              <p className="post-details__line"><strong>Status:</strong> {selectedAdmin.is_active ? "active" : "inactive"}</p>
              <p className="post-details__line"><strong>Public Profile:</strong> {selectedAdmin.admin_profile.is_public ? "public" : "private"}</p>
              <p className="post-details__line"><strong>Last Login:</strong> {selectedAdmin.last_login_at ? formatDateTime(selectedAdmin.last_login_at) : "Never"}</p>
              <p className="post-details__line"><strong>Created:</strong> {formatDateTime(selectedAdmin.created_at)}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn--primary" type="button" onClick={() => setSelectedAdmin(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activationTarget && activationNext !== null ? (
        <div className="modal-overlay" role="presentation" onClick={() => { setActivationTarget(null); setActivationNext(null); }}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">{activationNext ? "Activate Admin" : "Deactivate Admin"}</h3>
            </header>
            <p className="post-details__line">
              {activationNext ? "Activate" : "Deactivate"} <strong>{activationTarget.admin_profile.full_name}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => { setActivationTarget(null); setActivationNext(null); }} disabled={isUpdatingActivation}>
                Cancel
              </button>
              <button className={`btn ${activationNext ? "btn--primary" : "btn--danger"}`} type="button" onClick={() => void handleActivation()} disabled={isUpdatingActivation}>
                {isUpdatingActivation ? "Saving..." : activationNext ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PageShell>
  );
}
