import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { ApiError, api, apiList } from "../../utils/api";
import { setUser } from "../../utils/auth";

type AdminProfile = {
  id: number;
  email: string | null;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
  is_public?: boolean;
  sort_order?: number;
  full_name: string;
  admin_role: "admin" | "super_admin";
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
};

type ManagerProfileRow = {
  user_id: number;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  full_name: string;
  admin_role: "admin" | "super_admin";
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
};

type ProfileFormState = {
  full_name: string;
  email: string;
  phone: string;
  admin_role: "admin" | "super_admin";
  is_active: boolean;
  is_public: boolean;
  sort_order: string;
  job_title: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  current_password: string;
  new_password: string;
};

const initialForm: ProfileFormState = {
  full_name: "",
  email: "",
  phone: "",
  admin_role: "admin",
  is_active: true,
  is_public: true,
  sort_order: "0",
  job_title: "",
  bio: "",
  avatar_url: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  current_password: "",
  new_password: "",
};

function toFormState(profile: AdminProfile): ProfileFormState {
  return {
    full_name: profile.full_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    admin_role: profile.admin_role === "super_admin" ? "super_admin" : "admin",
    is_active: profile.is_active,
    is_public: profile.is_public ?? true,
    sort_order: String(profile.sort_order ?? 0),
    job_title: profile.job_title ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    github_url: profile.github_url ?? "",
    portfolio_url: profile.portfolio_url ?? "",
    current_password: "",
    new_password: "",
  };
}

function formatRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function fromManagerProfile(row: ManagerProfileRow): AdminProfile {
  return {
    id: row.user_id,
    email: row.email,
    phone: row.phone,
    is_admin: true,
    is_active: row.is_active,
    is_public: row.is_public,
    sort_order: row.sort_order,
    full_name: row.full_name,
    admin_role: row.admin_role,
    avatar_url: row.avatar_url,
    bio: row.bio,
    job_title: row.job_title,
    linkedin_url: row.linkedin_url,
    github_url: row.github_url,
    portfolio_url: row.portfolio_url,
  };
}

export function MyProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingTarget, setEditingTarget] = useState<AdminProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const me = await api<AdminProfile>("/auth/me");
        let allAdmins: AdminProfile[] = [];

        try {
          allAdmins = await api<AdminProfile[]>("/auth/admins");
        } catch {
          const fallback = await apiList<ManagerProfileRow>("/profiles/managers?limit=100&sortBy=sort_order&order=asc");
          allAdmins = fallback.data.map(fromManagerProfile);
        }

        if (!active) {
          return;
        }
        setProfile(me);
        if (allAdmins.length) {
          setAdmins(allAdmins);
        } else {
          setAdmins([me]);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        if (err instanceof ApiError) {
          setError(err.message || "Failed to load profile.");
        } else {
          setError("Failed to load profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const isSuperAdmin = profile?.admin_role === "super_admin";

  const canEditAdmin = (admin: AdminProfile): boolean => {
    if (!profile) {
      return false;
    }
    return Boolean(isSuperAdmin || admin.id === profile.id);
  };

  const openEdit = (target: AdminProfile) => {
    if (!canEditAdmin(target)) {
      return;
    }
    setForm(toFormState(target));
    setFormError("");
    setSuccess("");
    setEditingTarget(target);
  };

  const closeEdit = () => {
    if (isSaving) {
      return;
    }
    setEditingTarget(null);
    setFormError("");
  };

  const isEditingSelf = useMemo(
    () => Boolean(profile && editingTarget && profile.id === editingTarget.id),
    [profile, editingTarget],
  );

  const saveProfile = async () => {
    if (!profile || !editingTarget) {
      return;
    }

    const payload: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      job_title: form.job_title.trim(),
      bio: form.bio.trim(),
      avatar_url: form.avatar_url.trim(),
      linkedin_url: form.linkedin_url.trim(),
      github_url: form.github_url.trim(),
      portfolio_url: form.portfolio_url.trim(),
    };

    if (!String(payload.full_name || "").trim()) {
      setFormError("Full name is required.");
      return;
    }

    const hasEmail = Boolean(String(payload.email || "").trim());
    const hasPhone = Boolean(String(payload.phone || "").trim());
    if (!hasEmail && !hasPhone) {
      setFormError("Enter at least email or phone.");
      return;
    }

    if (isEditingSelf) {
      if (form.new_password.trim()) {
        if (!form.current_password.trim()) {
          setFormError("Enter your current password first.");
          return;
        }
        payload.current_password = form.current_password;
        payload.new_password = form.new_password;
      }
    } else if (isSuperAdmin) {
      payload.admin_role = form.admin_role;
      payload.is_active = form.is_active;
      payload.is_public = form.is_public;
      payload.sort_order = Number(form.sort_order || "0");
      if (form.new_password.trim()) {
        payload.new_password = form.new_password;
      }
    }

    setIsSaving(true);
    setFormError("");
    setError("");

    try {
      const endpoint = isEditingSelf ? "/auth/me" : `/auth/admins/${editingTarget.id}`;
      const updated = await api<AdminProfile>(endpoint, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setAdmins((current) => {
        const exists = current.some((item) => item.id === updated.id);
        if (!exists) {
          return [updated, ...current];
        }
        return current.map((item) => (item.id === updated.id ? updated : item));
      });

      if (profile.id === updated.id) {
        setProfile(updated);
        setUser({
          id: updated.id,
          email: updated.email ?? "",
          full_name: updated.full_name,
          admin_role: updated.admin_role,
        });
        window.dispatchEvent(new Event("dh-auth-updated"));
      }

      setEditingTarget(null);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || "Failed to update profile.");
      } else {
        setFormError("Failed to update profile.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = profile?.full_name || "Admin";
  const role = profile?.admin_role ? formatRole(profile.admin_role) : "Admin";
  const canEditSelf = Boolean(profile?.is_admin && profile);

  return (
    <PageShell title="My Profile" subtitle="Personal admin account details and workspace preferences.">
      <div className="my-profile-scroll">
      {success ? (
        <Card>
          <p className="alert alert--success">{success}</p>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <p className="alert alert--error">{error}</p>
        </Card>
      ) : null}

      <div className="profile-grid">
        <Card>
          <div className="profile-main">
            <span className="profile-avatar" aria-hidden>
              {displayName.charAt(0)}
            </span>
            <div>
              <h3 className="section-title">{displayName}</h3>
              <p className="info-text">{profile?.email || "No email"}</p>
              {profile?.phone ? <p className="info-text">{profile.phone}</p> : null}
              {profile?.job_title ? <p className="info-text">{profile.job_title}</p> : null}
            </div>
          </div>
          <div className="profile-badges">
            <Badge tone="default">{role}</Badge>
            <Badge tone="default">{profile?.is_active ? "Active" : "Inactive"}</Badge>
          </div>
          {canEditSelf ? (
            <div className="mobile-profile-card__actions">
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={() => openEdit(profile as AdminProfile)}
                disabled={loading}
              >
                Edit
              </button>
            </div>
          ) : null}
        </Card>

        <Card>
          <h3 className="section-title">Account Notes</h3>
          <p className="info-text">Admin can edit only their account. Super admin can edit all admin users.</p>
        </Card>
      </div>

      <Card>
        <h3 className="section-title">Admin Users</h3>
        <p className="info-text">All admin accounts from database.</p>
        <div className="admin-users-grid">
          {admins.map((admin) => (
            <article className="admin-user-card" key={admin.id}>
              <h4 className="admin-user-card__name">{admin.full_name}</h4>
              <div className="profile-badges">
                <Badge tone="default">{formatRole(admin.admin_role)}</Badge>
                <Badge tone="default">{admin.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="info-text">{admin.email || "No email"}</p>
              {admin.phone ? <p className="info-text">{admin.phone}</p> : null}
              {admin.job_title ? <p className="info-text">{admin.job_title}</p> : null}
              {canEditAdmin(admin) ? (
                <div className="mobile-profile-card__actions">
                  <button className="btn btn--secondary btn--sm" type="button" onClick={() => openEdit(admin)}>
                    Edit
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </Card>

      {editingTarget ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={closeEdit}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Edit Admin Profile</h3>
            </header>

            <div className="form-stack">
              <label className="field">
                <span className="field__label">Full Name</span>
                <input
                  className="field__control"
                  type="text"
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  className="field__control"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Phone</span>
                <input
                  className="field__control"
                  type="text"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>

              {!isEditingSelf && isSuperAdmin ? (
                <>
                  <label className="field">
                    <span className="field__label">Admin Role</span>
                    <select
                      className="field__control"
                      value={form.admin_role}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, admin_role: event.target.value as "admin" | "super_admin" }))
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">Sort Order</span>
                    <input
                      className="field__control"
                      type="number"
                      value={form.sort_order}
                      onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                    />
                  </label>
                  <label className="field announcement-form-switch">
                    <span className="field__label">Active</span>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                    />
                  </label>
                  <label className="field announcement-form-switch">
                    <span className="field__label">Public</span>
                    <input
                      type="checkbox"
                      checked={form.is_public}
                      onChange={(event) => setForm((current) => ({ ...current, is_public: event.target.checked }))}
                    />
                  </label>
                </>
              ) : null}

              <label className="field">
                <span className="field__label">Job Title</span>
                <input
                  className="field__control"
                  type="text"
                  value={form.job_title}
                  onChange={(event) => setForm((current) => ({ ...current, job_title: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Avatar URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={form.avatar_url}
                  onChange={(event) => setForm((current) => ({ ...current, avatar_url: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">LinkedIn URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={form.linkedin_url}
                  onChange={(event) => setForm((current) => ({ ...current, linkedin_url: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">GitHub URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={form.github_url}
                  onChange={(event) => setForm((current) => ({ ...current, github_url: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Portfolio URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={form.portfolio_url}
                  onChange={(event) => setForm((current) => ({ ...current, portfolio_url: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Bio</span>
                <textarea
                  className="textarea-control"
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                />
              </label>

              {isEditingSelf ? (
                <label className="field">
                  <span className="field__label">Current Password</span>
                  <input
                    className="field__control"
                    type="password"
                    value={form.current_password}
                    onChange={(event) => setForm((current) => ({ ...current, current_password: event.target.value }))}
                    placeholder="Required to change password"
                  />
                </label>
              ) : null}

              <label className="field">
                <span className="field__label">New Password</span>
                <input
                  className="field__control"
                  type="password"
                  value={form.new_password}
                  onChange={(event) => setForm((current) => ({ ...current, new_password: event.target.value }))}
                  disabled={isEditingSelf ? !form.current_password.trim() : false}
                  placeholder="Min 8 characters"
                />
              </label>
            </div>

            {formError ? <p className="alert alert--error">{formError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closeEdit} disabled={isSaving}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={saveProfile} disabled={isSaving || loading}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </PageShell>
  );
}
