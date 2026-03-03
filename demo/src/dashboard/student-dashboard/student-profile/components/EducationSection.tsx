"use client";

import { useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

type Education = {
  id: number;
  degree: string;
  fieldOfStudy?: string | null;
  institution: string;
  country?: string | null;
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
};

type FormState = {
  id?: number;
  degree: string;
  fieldOfStudy: string;
  institution: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  description: string;
};

const toInputDate = (d?: string | null) => (d ? d.slice(0, 10) : "");
const fmt = (d?: string | null) => (d ? d.slice(0, 10) : "");

export default function EducationSection({
  items,
  onReload,
  onMessage,
}: {
  items: Education[];
  onReload: () => Promise<void>;
  onMessage: (m: { error?: string | null; success?: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    degree: "",
    fieldOfStudy: "",
    institution: "",
    country: "",
    city: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  const reset = () => {
    setForm({
      degree: "",
      fieldOfStudy: "",
      institution: "",
      country: "",
      city: "",
      startDate: "",
      endDate: "",
      description: "",
    });
  };

  const openAdd = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (x: Education) => {
    setForm({
      id: x.id,
      degree: x.degree || "",
      fieldOfStudy: x.fieldOfStudy || "",
      institution: x.institution || "",
      country: x.country || "",
      city: x.city || "",
      startDate: toInputDate(x.startDate),
      endDate: toInputDate(x.endDate),
      description: x.description || "",
    });
    setOpen(true);
  };

  const canSave = useMemo(() => {
    if (!form.degree.trim()) return false;
    if (!form.institution.trim()) return false;
    return true;
  }, [form]);

  const save = async () => {
    if (!canSave) return;
    onMessage({ error: null, success: null });

    try {
      setSaving(true);
      const payload = {
        degree: form.degree.trim(),
        fieldOfStudy: form.fieldOfStudy.trim() || null,
        institution: form.institution.trim(),
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        description: form.description.trim() || null,
      };

      const res = await fetch(
        form.id
          ? `${API}/students/me/educations/${form.id}`
          : `${API}/students/me/educations`,
        {
          method: form.id ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save education");

      setOpen(false);
      await onReload();
      onMessage({ success: "Education saved ✅" });
    } catch (e: any) {
      onMessage({ error: e?.message || "Failed to save education" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    onMessage({ error: null, success: null });

    try {
      const res = await fetch(`${API}/students/me/educations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to delete education");
      }

      await onReload();
      onMessage({ success: "Education deleted ✅" });
    } catch (e: any) {
      onMessage({ error: e?.message || "Failed to delete education" });
    }
  };

  return (
    <div className="instructor__profile-form-wrap mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">Education</h5>
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
                    {x.degree}{" "}
                    {x.fieldOfStudy ? (
                      <span className="text-muted fw-normal">• {x.fieldOfStudy}</span>
                    ) : null}
                  </div>
                  <div className="small text-muted">
                    {x.institution}
                    {(x.country || x.city) ? (
                      <> • {x.country || ""}{x.city ? `, ${x.city}` : ""}</>
                    ) : null}
                    {(x.startDate || x.endDate) ? (
                      <> • {fmt(x.startDate)} → {fmt(x.endDate)}</>
                    ) : null}
                  </div>
                  {x.description ? <div className="mt-2">{x.description}</div> : null}
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
        <div className="text-muted">No education added yet.</div>
      )}

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
              <h5 className="mb-0">{form.id ? "Edit Education" : "Add Education"}</h5>
              <button className="btn btn-sm btn-border" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Degree *</label>
                <input
                  className="form-control"
                  value={form.degree}
                  onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Institution *</label>
                <input
                  className="form-control"
                  value={form.institution}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, institution: e.target.value }))
                  }
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Field of Study</label>
                <input
                  className="form-control"
                  value={form.fieldOfStudy}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, fieldOfStudy: e.target.value }))
                  }
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startDate: e.target.value }))
                  }
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endDate: e.target.value }))
                  }
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

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
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
                <button
                  type="button"
                  className="btn btn-border"
                  onClick={() => setOpen(false)}
                >
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

