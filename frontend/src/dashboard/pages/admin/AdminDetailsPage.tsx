import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { ApiError, api } from "../../utils/api";
import type { AdminRecord } from "./adminManagement";
import { formatAdminRole } from "./adminManagement";

type EditAdminForm = {
  full_name: string;
  email: string;
  phone: string;
  admin_role: "admin" | "super_admin";
  is_active: boolean;
  job_title: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  new_password: string;
};

function toFormState(admin: AdminRecord): EditAdminForm {
  return {
    full_name: admin.full_name ?? "",
    email: admin.email ?? "",
    phone: admin.phone ?? "",
    admin_role: admin.admin_role ?? "admin",
    is_active: admin.is_active,
    job_title: admin.job_title ?? "",
    bio: admin.bio ?? "",
    avatar_url: admin.avatar_url ?? "",
    linkedin_url: admin.linkedin_url ?? "",
    github_url: admin.github_url ?? "",
    portfolio_url: admin.portfolio_url ?? "",
    new_password: "",
  };
}

export function AdminDetailsPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminRecord | null>(null);
  const [form, setForm] = useState<EditAdminForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const userId = useMemo(() => Number(params.id), [params.id]);

  useEffect(() => {
    if (!Number.isFinite(userId) || userId <= 0) {
      navigate("/admin/admins", { replace: true });
      return;
    }

    let active = true;

    const loadAdmin = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api<AdminRecord>(`/api/admins/${userId}`);
        if (!active) {
          return;
        }
        setAdmin(data);
        setForm(toFormState(data));
      } catch (err) {
        if (!active) {
          return;
        }
        if (err instanceof ApiError) {
          setError(err.message || "Failed to load admin.");
        } else {
          setError("Failed to load admin.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAdmin();

    return () => {
      active = false;
    };
  }, [navigate, userId]);

  const saveAdmin = async () => {
    if (!form || !admin) {
      return;
    }

    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Provide at least one of email or phone.");
      return;
    }
    if (form.new_password.trim() && form.new_password.trim().length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await api<AdminRecord>(`/api/admins/${admin.id}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          admin_role: form.admin_role,
          is_active: form.is_active,
          job_title: form.job_title.trim(),
          bio: form.bio.trim(),
          avatar_url: form.avatar_url.trim(),
          linkedin_url: form.linkedin_url.trim(),
          github_url: form.github_url.trim(),
          portfolio_url: form.portfolio_url.trim(),
          new_password: form.new_password.trim() || undefined,
        }),
      });
      setAdmin(updated);
      setForm(toFormState(updated));
      setSuccess("Admin account updated successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to update admin.");
      } else {
        setError("Failed to update admin.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAdmin = async () => {
    if (!admin) {
      return;
    }

    const confirmed = window.confirm(`Delete admin account "${admin.full_name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await api<{ deleted: true }>(`/api/admins/${admin.id}`, { method: "DELETE" });
      navigate("/admin/admins", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to delete admin.");
      } else {
        setError("Failed to delete admin.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageShell title="Admin Details" subtitle="Super admin authority context for one admin account.">
      {error ? (
        <Card>
          <p className="alert alert--error">{error}</p>
        </Card>
      ) : null}

      {success ? (
        <Card>
          <p className="alert alert--success">{success}</p>
        </Card>
      ) : null}

      <Card>
        {loading || !admin || !form ? (
          <p className="info-text">Loading admin details...</p>
        ) : (
          <>
            <div className="profile-main">
              <span className="profile-avatar" aria-hidden>
                {admin.full_name.charAt(0)}
              </span>
              <div>
                <h3 className="section-title">{admin.full_name}</h3>
                <p className="info-text">{admin.email || "No email"}</p>
                {admin.phone ? <p className="info-text">{admin.phone}</p> : null}
              </div>
            </div>
            <div className="profile-badges">
              <Badge tone="default">{formatAdminRole(admin.admin_role)}</Badge>
              <Badge tone="default">{admin.is_active ? "Active" : "Inactive"}</Badge>
            </div>

            <div className="form-stack">
              <label className="field">
                <span className="field__label">Full Name</span>
                <input
                  className="field__control"
                  type="text"
                  value={form.full_name}
                  onChange={(event) => setForm((current) => (current ? { ...current, full_name: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  className="field__control"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => (current ? { ...current, email: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Phone</span>
                <input
                  className="field__control"
                  type="text"
                  value={form.phone}
                  onChange={(event) => setForm((current) => (current ? { ...current, phone: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Role</span>
                <select
                  className="field__control"
                  value={form.admin_role}
                  onChange={(event) =>
                    setForm((current) => (current ? { ...current, admin_role: event.target.value as "admin" | "super_admin" } : current))
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </label>
              <label className="field announcement-form-switch">
                <span className="field__label">Active</span>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => (current ? { ...current, is_active: event.target.checked } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Job Title</span>
                <input
                  className="field__control"
                  type="text"
                  value={form.job_title}
                  onChange={(event) => setForm((current) => (current ? { ...current, job_title: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Avatar URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={form.avatar_url}
                  onChange={(event) => setForm((current) => (current ? { ...current, avatar_url: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">LinkedIn URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={form.linkedin_url}
                  onChange={(event) => setForm((current) => (current ? { ...current, linkedin_url: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">GitHub URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={form.github_url}
                  onChange={(event) => setForm((current) => (current ? { ...current, github_url: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Portfolio URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={form.portfolio_url}
                  onChange={(event) => setForm((current) => (current ? { ...current, portfolio_url: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Bio</span>
                <textarea
                  className="textarea-control"
                  value={form.bio}
                  onChange={(event) => setForm((current) => (current ? { ...current, bio: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Reset Password</span>
                <input
                  className="field__control"
                  type="password"
                  value={form.new_password}
                  onChange={(event) => setForm((current) => (current ? { ...current, new_password: event.target.value } : current))}
                  placeholder="Set a new password"
                />
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => navigate("/admin/admins")}>
                Back
              </button>
              <button className="btn btn--danger" type="button" onClick={deleteAdmin} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete Admin"}
              </button>
              <button className="btn btn--primary" type="button" onClick={saveAdmin} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </Card>
    </PageShell>
  );
}

