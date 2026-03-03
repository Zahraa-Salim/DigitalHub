"use client";

import { useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

type Experience = {
  id: number;
  title: string;
  company: string;
  country?: string | null;
  city?: string | null;
  isCurrent: boolean;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
};

type FormState = {
  id?: number;
  title: string;
  company: string;
  country: string;
  city: string;
  isCurrent: boolean;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  description: string;
};

const toInputDate = (d?: string | null) => (d ? d.slice(0, 10) : "");
const fmt = (d?: string | null) => (d ? d.slice(0, 10) : "");

export default function ExperienceSection({
  items,
  onReload,
  onMessage,
}: {
  items: Experience[];
  onReload: () => Promise<void>;
  onMessage: (m: { error?: string | null; success?: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    title: "",
    company: "",
    country: "",
    city: "",
    isCurrent: false,
    startDate: "",
    endDate: "",
    description: "",
  });

  const reset = () => {
    setForm({
      title: "",
      company: "",
      country: "",
      city: "",
      isCurrent: false,
      startDate: "",
      endDate: "",
      description: "",
    });
  };

  const openAdd = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (x: Experience) => {
    setForm({
      id: x.id,
      title: x.title || "",
      company: x.company || "",
      country: x.country || "",
      city: x.city || "",
      isCurrent: !!x.isCurrent,
      startDate: toInputDate(x.startDate),
      endDate: x.isCurrent ? "" : toInputDate(x.endDate),
      description: x.description || "",
    });
    setOpen(true);
  };

  const canSave = useMemo(() => {
    if (!form.title.trim()) return false;
    if (!form.company.trim()) return false;
    if (!form.startDate) return false;
    if (!form.isCurrent && !form.endDate) return false;
    return true;
  }, [form]);

  const save = async () => {
    if (!canSave) return;
    onMessage({ error: null, success: null });

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        company: form.company.trim(),
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        isCurrent: form.isCurrent,
        startDate: form.startDate,
        endDate: form.isCurrent ? null : form.endDate || null,
        description: form.description.trim() || null,
      };

      const res = await fetch(
        form.id
          ? `${API}/students/me/experiences/${form.id}`
          : `${API}/students/me/experiences`,
        {
          method: form.id ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save experience");

      setOpen(false);
      await onReload();
      onMessage({ success: "Experience saved ✅" });
    } catch (e: any) {
      onMessage({ error: e?.message || "Failed to save experience" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    onMessage({ error: null, success: null });

    try {
      const res = await fetch(`${API}/students/me/experiences/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to delete experience");
      }

      await onReload();
      onMessage({ success: "Experience deleted ✅" });
    } catch (e: any) {
      onMessage({ error: e?.message || "Failed to delete experience" });
    }
  };

  return (
    <div className="instructor__profile-form-wrap mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">Work Experience</h5>
        <button type="button" className="btn btn-two" onClick={openAdd}>
          + Add
        </button>
      </div>

      {items?.length ? (
        <div className="d-grid gap-2">
          {items.map((x) => (
            <div key={x.id} className="border rounded p-3">
              <div className="d-flex justify-content-between gap-2">
                <div>
                  <div className="fw-semibold">
                    {x.title}{" "}
                    <span className="text-muted fw-normal">at</span>{" "}
                    {x.company}
                  </div>
                  <div className="small text-muted">
                    {fmt(x.startDate)} → {x.isCurrent ? "Present" : fmt(x.endDate)}
                    {(x.country || x.city) ? (
                      <> • {x.country || ""}{x.city ? `, ${x.city}` : ""}</>
                    ) : null}
                  </div>
                  {x.description ? (
                    <div className="mt-2">{x.description}</div>
                  ) : null}
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-border"
                    onClick={() => openEdit(x)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => remove(x.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted">No experience added yet.</div>
      )}

      {/* Simple modal */}
      {open ? (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: "rgba(0,0,0,0.45)", zIndex: 9999 }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded p-4"
            style={{
              width: "min(800px, 92vw)",
              margin: "6vh auto",
              maxHeight: "88vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{form.id ? "Edit Experience" : "Add Experience"}</h5>
              <button className="btn btn-sm btn-border" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Title *</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Company *</label>
                <input
                  className="form-control"
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Country</label>
                <input
                  className="form-control"
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">City</label>
                <input
                  className="form-control"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">End Date {form.isCurrent ? "" : "*"}</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.endDate}
                  disabled={form.isCurrent}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>

              <div className="col-12">
                <div className="form-check mt-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.isCurrent}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        isCurrent: e.target.checked,
                        endDate: e.target.checked ? "" : p.endDate,
                      }))
                    }
                    id="exp_current"
                  />
                  <label className="form-check-label" htmlFor="exp_current">
                    I currently work here
                  </label>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="col-12 d-flex gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-two"
                  disabled={!canSave || saving}
                  onClick={save}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button type="button" className="btn btn-border" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

