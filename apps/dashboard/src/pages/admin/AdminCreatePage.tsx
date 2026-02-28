import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { ApiError, api } from "../../utils/api";
import type { AdminRecord } from "./adminManagement";

type CreateAdminForm = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  admin_role: "admin" | "super_admin";
  is_active: boolean;
};

const initialForm: CreateAdminForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  admin_role: "admin",
  is_active: true,
};

export function AdminCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateAdminForm>(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!form.password.trim() || form.password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Provide at least one of email or phone.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const created = await api<AdminRecord>("/api/admins", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password,
          admin_role: form.admin_role,
          is_active: form.is_active,
        }),
      });
      navigate(`/admin/admins/${created.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to create admin.");
      } else {
        setError("Failed to create admin.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell title="Create Admin" subtitle="Create a new admin account in authority context.">
      {error ? (
        <Card>
          <p className="alert alert--error">{error}</p>
        </Card>
      ) : null}

      <Card>
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
          <label className="field">
            <span className="field__label">Initial Password</span>
            <input
              className="field__control"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Min 8 characters"
            />
          </label>
          <label className="field">
            <span className="field__label">Role</span>
            <select
              className="field__control"
              value={form.admin_role}
              onChange={(event) => setForm((current) => ({ ...current, admin_role: event.target.value as "admin" | "super_admin" }))}
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
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn btn--secondary" type="button" onClick={() => navigate("/admin/admins")}>
            Cancel
          </button>
          <button className="btn btn--primary" type="button" onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Admin"}
          </button>
        </div>
      </Card>
    </PageShell>
  );
}

