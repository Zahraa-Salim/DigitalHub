"use client";

import { useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "HIGH";
type Skill = { id: number; name: string; level: SkillLevel };

export default function SkillsSection({
  items,
  onReload,
  onMessage,
}: {
  items: Skill[];
  onReload: () => Promise<void>;
  onMessage: (m: { error?: string | null; success?: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<SkillLevel>("BEGINNER");
  const [saving, setSaving] = useState(false);

  const canAdd = useMemo(() => name.trim().length > 0, [name]);

  const add = async () => {
    if (!canAdd) return;
    onMessage({ error: null, success: null });

    try {
      setSaving(true);
      const res = await fetch(`${API}/students/me/skills`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), level }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to add skill");

      setName("");
      await onReload();
      onMessage({ success: "Skill added ✅" });
    } catch (e: any) {
      onMessage({ error: e?.message || "Failed to add skill" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    onMessage({ error: null, success: null });

    try {
      const res = await fetch(`${API}/students/me/skills/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to delete skill");
      }
      await onReload();
      onMessage({ success: "Skill removed ✅" });
    } catch (e: any) {
      onMessage({ error: e?.message || "Failed to delete skill" });
    }
  };

  return (
    <div className="instructor__profile-form-wrap mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">Skills</h5>
      </div>

      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-6">
          <label className="form-label">Skill</label>
          <input
            className="form-control"
            placeholder="e.g. Next.js"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        </div>

        <div className="col-md-4">
          <label className="form-label">Level</label>
          <select
            className="form-control"
            value={level}
            onChange={(e) => setLevel(e.target.value as SkillLevel)}
          >
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div className="col-md-2 d-grid">
          <button
            type="button"
            className="btn btn-two"
            onClick={add}
            disabled={!canAdd || saving}
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      {items?.length ? (
        <div className="d-flex flex-wrap gap-2">
          {items.map((s) => (
            <span
              key={s.id}
              className="badge bg-light text-dark"
              style={{ cursor: "pointer" }}
              title="Click to remove"
              onClick={() => remove(s.id)}
            >
              {s.name} • {s.level} ✕
            </span>
          ))}
        </div>
      ) : (
        <div className="text-muted">No skills yet.</div>
      )}
    </div>
  );
}

