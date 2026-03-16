// File: frontend/src/dashboard/pages/admin/ApplicationFormsPage.tsx
// Purpose: Application Forms — General form, per-Program custom forms, per-Cohort custom forms.

import { type DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { PulseDots } from "../../components/PulseDots";
import { ToastStack } from "../../components/ToastStack";
import { useDashboardToasts } from "../../hooks/useDashboardToasts";
import { api } from "../../utils/api";
import "../../styles/application-forms.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormFieldType =
  | "text" | "textarea" | "email" | "phone" | "select"
  | "checkbox" | "radio" | "date" | "file" | "number" | "url";

export type FormField = {
  id?: number; form_id?: number; name: string; label: string; type: FormFieldType;
  required?: boolean; options?: unknown; placeholder?: string | null;
  min_length?: number | null; max_length?: number | null; sort_order?: number; is_enabled?: boolean;
};

export type FormMeta = {
  id: number | null; key: string; title: string | null; description: string | null;
  is_active: boolean; updated_at?: unknown; fields: FormField[];
};

export type ProgramOption = {
  id: number; title: string; slug: string; is_published: boolean;
  application_form_id: number | null; use_general_form: boolean;
};

export type CohortOption = {
  id: number; name: string; program_title: string;
  use_general_form: boolean; application_form_id: number | null;
};

type CohortFormResponse = {
  cohort: CohortOption; general_form: FormMeta; custom_form: FormMeta | null;
  suggested_custom_form: FormMeta; resolved_form: FormMeta;
};

type ProgramFormResponse = {
  program: ProgramOption; general_form: FormMeta; custom_form: FormMeta | null;
  suggested_custom_form: FormMeta; resolved_form: FormMeta;
};

type EditableField = {
  id: string; name: string; label: string; type: FormFieldType; required: boolean;
  placeholder: string; min_length: number | null; max_length: number | null;
  options: Array<{ label: string; value: string }>; is_enabled: boolean;
};

type NewFieldDraft = {
  label: string; type: FormFieldType; required: boolean; placeholder: string;
  min_length: string; max_length: string; optionsText: string;
};

type FieldEditDraft = {
  label: string; name: string; type: FormFieldType; required: boolean; placeholder: string;
  min_length: string; max_length: string; optionsText: string; is_enabled: boolean;
};

type PageTab = "general" | "program" | "cohort";
type StartMode = "blank" | "copy";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text",     label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "email",    label: "Email" },
  { value: "phone",    label: "Phone" },
  { value: "number",   label: "Number" },
  { value: "url",      label: "URL / Link" },
  { value: "date",     label: "Date" },
  { value: "select",   label: "Dropdown (Select)" },
  { value: "radio",    label: "Radio (Single Choice)" },
  { value: "checkbox", label: "Checkbox (Multi)" },
  { value: "file",     label: "File Upload" },
];

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Text", textarea: "Long Text", email: "Email", phone: "Phone",
  number: "Number", url: "URL", date: "Date", select: "Select",
  radio: "Radio", checkbox: "Checkbox", file: "File",
};

const HAS_OPTIONS: FormFieldType[] = ["select", "radio", "checkbox"];
const HAS_LENGTH: FormFieldType[] = ["text", "textarea", "email", "phone", "url"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSafeFieldName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64);
}

function parseOptions(options: unknown): Array<{ label: string; value: string }> {
  if (Array.isArray(options)) {
    return options.map((item) => {
      if (typeof item === "string") return { label: item, value: item };
      if (item && typeof item === "object") {
        const v = item as { label?: unknown; value?: unknown };
        if (typeof v.label === "string" && typeof v.value === "string") return v as { label: string; value: string };
      }
      return null;
    }).filter((e): e is { label: string; value: string } => Boolean(e));
  }
  return [];
}

function toOptionsText(opts: Array<{ label: string; value: string }>): string {
  return opts.map((e) => e.label || e.value).join(", ");
}

function mapFields(rawFields: FormField[]): EditableField[] {
  return rawFields.map((f, i) => ({
    id: String(f.id ?? `field-${i}`),
    name: f.name || toSafeFieldName(f.label || `field_${i + 1}`),
    label: f.label || `Field ${i + 1}`,
    type: (f.type as FormFieldType) || "text",
    required: Boolean(f.required),
    placeholder: f.placeholder ?? "",
    min_length: f.min_length ?? null,
    max_length: f.max_length ?? null,
    options: parseOptions(f.options),
    is_enabled: f.is_enabled !== false,
  }));
}

function toPayloadFields(fields: EditableField[]): FormField[] {
  return fields.map((f, i) => ({
    name: toSafeFieldName(f.name || f.label) || `field_${i + 1}`,
    label: f.label, type: f.type, required: f.required,
    placeholder: f.placeholder || null,
    min_length: HAS_LENGTH.includes(f.type) ? (f.min_length ?? null) : null,
    max_length: HAS_LENGTH.includes(f.type) ? (f.max_length ?? null) : null,
    sort_order: i, is_enabled: f.is_enabled,
    ...(HAS_OPTIONS.includes(f.type) ? { options: f.options } : {}),
  }));
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const GripIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="currentColor">
    <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
    <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
  </svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

// ─── FieldEditor ──────────────────────────────────────────────────────────────

type FieldEditorProps = {
  fields: EditableField[]; saving: boolean; readonly?: boolean;
  onSave: (fields: EditableField[]) => Promise<void>; onReload: () => Promise<void>;
};

function FieldEditor({ fields, saving, readonly = false, onSave }: FieldEditorProps) {
  const [localFields, setLocalFields] = useState<EditableField[]>(fields);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FieldEditDraft | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<NewFieldDraft>({
    label: "", type: "text", required: false, placeholder: "", min_length: "", max_length: "", optionsText: "",
  });
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const addRef = useRef<HTMLDivElement | null>(null);
  const addLabelRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setLocalFields(fields); }, [fields]);
  useEffect(() => {
    if (isAdding) {
      setTimeout(() => { addRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); addLabelRef.current?.focus(); }, 50);
    }
  }, [isAdding]);

  const persist = async (next: EditableField[]) => { setLocalFields(next); await onSave(next); };

  const startEdit = (f: EditableField) => {
    setIsAdding(false); setEditingId(f.id);
    setEditDraft({
      label: f.label, name: f.name, type: f.type, required: f.required,
      placeholder: f.placeholder,
      min_length: f.min_length != null ? String(f.min_length) : "",
      max_length: f.max_length != null ? String(f.max_length) : "",
      optionsText: toOptionsText(f.options), is_enabled: f.is_enabled,
    });
  };

  const saveEdit = async (fieldId: string) => {
    if (!editDraft) return;
    const opts = HAS_OPTIONS.includes(editDraft.type)
      ? editDraft.optionsText.split(",").map(v => v.trim()).filter(Boolean).map(v => ({ label: v, value: v })) : [];
    const next = localFields.map(f => f.id !== fieldId ? f : {
      ...f, label: editDraft.label.trim() || f.label,
      name: toSafeFieldName(editDraft.name || editDraft.label) || f.name,
      type: editDraft.type, required: editDraft.required, placeholder: editDraft.placeholder,
      min_length: editDraft.min_length ? Number(editDraft.min_length) : null,
      max_length: editDraft.max_length ? Number(editDraft.max_length) : null,
      options: opts, is_enabled: editDraft.is_enabled,
    });
    await persist(next); setEditingId(null); setEditDraft(null);
  };

  const addField = async () => {
    if (!newDraft.label.trim()) return;
    const opts = HAS_OPTIONS.includes(newDraft.type)
      ? newDraft.optionsText.split(",").map(v => v.trim()).filter(Boolean).map(v => ({ label: v, value: v })) : [];
    await persist([...localFields, {
      id: `new-${Date.now()}`, name: toSafeFieldName(newDraft.label) || `field_${localFields.length + 1}`,
      label: newDraft.label, type: newDraft.type, required: newDraft.required,
      placeholder: newDraft.placeholder,
      min_length: newDraft.min_length ? Number(newDraft.min_length) : null,
      max_length: newDraft.max_length ? Number(newDraft.max_length) : null,
      options: opts, is_enabled: true,
    }]);
    setNewDraft({ label: "", type: "text", required: false, placeholder: "", min_length: "", max_length: "", optionsText: "" });
    setIsAdding(false);
  };

  const deleteField = async (fieldId: string, label: string) => {
    if (!window.confirm(`Delete field "${label}"?`)) return;
    await persist(localFields.filter(f => f.id !== fieldId));
    if (editingId === fieldId) { setEditingId(null); setEditDraft(null); }
  };

  const moveField = async (index: number, dir: -1 | 1) => {
    const t = index + dir;
    if (t < 0 || t >= localFields.length) return;
    const clone = [...localFields]; const [item] = clone.splice(index, 1); clone.splice(t, 0, item);
    await persist(clone);
  };

  const handleDrop = async (dropIndex: number) => {
    if (dragFrom === null || dragFrom === dropIndex) { setDragFrom(null); setDragOver(null); return; }
    const clone = [...localFields]; const [item] = clone.splice(dragFrom, 1); clone.splice(dropIndex, 0, item);
    setDragFrom(null); setDragOver(null); await persist(clone);
  };

  const FieldForm = ({ draft, setDraft }: {
    draft: NewFieldDraft | FieldEditDraft;
    setDraft: (fn: (d: NewFieldDraft | FieldEditDraft) => NewFieldDraft | FieldEditDraft) => void;
  }) => (
    <div className="afp-form-grid">
      <div className="afp-control">
        <label className="afp-label">Label *</label>
        <input className="afp-input" value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} placeholder="e.g. Full Name" ref={draft === newDraft ? addLabelRef : undefined} />
      </div>
      {"name" in draft && (
        <div className="afp-control">
          <label className="afp-label">Field key <span className="afp-label-hint">(DB name)</span></label>
          <input className="afp-input afp-input--mono" value={(draft as FieldEditDraft).name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
        </div>
      )}
      <div className="afp-control">
        <label className="afp-label">Type</label>
        <select className="afp-input" value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as FormFieldType }))}>
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {!HAS_OPTIONS.includes(draft.type) && draft.type !== "file" && draft.type !== "date" && (
        <div className="afp-control">
          <label className="afp-label">Placeholder</label>
          <input className="afp-input" value={draft.placeholder} onChange={e => setDraft(d => ({ ...d, placeholder: e.target.value }))} placeholder="Hint shown inside field" />
        </div>
      )}
      {HAS_LENGTH.includes(draft.type) && (
        <>
          <div className="afp-control">
            <label className="afp-label">Min length</label>
            <input className="afp-input" type="number" min="0" value={draft.min_length} onChange={e => setDraft(d => ({ ...d, min_length: e.target.value }))} placeholder="—" />
          </div>
          <div className="afp-control">
            <label className="afp-label">Max length</label>
            <input className="afp-input" type="number" min="0" value={draft.max_length} onChange={e => setDraft(d => ({ ...d, max_length: e.target.value }))} placeholder="—" />
          </div>
        </>
      )}
      {HAS_OPTIONS.includes(draft.type) && (
        <div className="afp-control afp-control--full">
          <label className="afp-label">Options <span className="afp-label-hint">(comma-separated)</span></label>
          <input className="afp-input" value={draft.optionsText} onChange={e => setDraft(d => ({ ...d, optionsText: e.target.value }))} placeholder="Option A, Option B, Option C" />
        </div>
      )}
      <div className="afp-checkbox-row-group">
        <label className="afp-checkbox-row">
          <input type="checkbox" checked={draft.required} onChange={e => setDraft(d => ({ ...d, required: e.target.checked }))} />
          <span>Required</span>
        </label>
        {"is_enabled" in draft && (
          <label className="afp-checkbox-row">
            <input type="checkbox" checked={(draft as FieldEditDraft).is_enabled} onChange={e => setDraft(d => ({ ...d, is_enabled: e.target.checked }))} />
            <span>Enabled</span>
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="afp-field-editor">
      <div className="afp-field-editor__header">
        <span className="afp-field-count">
          {localFields.filter(f => f.is_enabled).length} / {localFields.length} field{localFields.length === 1 ? "" : "s"} enabled
        </span>
        {!readonly && (
          <button className="afp-btn afp-btn--primary afp-btn--sm" type="button"
            onClick={() => { setEditingId(null); setEditDraft(null); setIsAdding(v => !v); }}>
            + Add Field
          </button>
        )}
      </div>

      {isAdding && !readonly && (
        <div className="afp-add-card" ref={addRef}>
          <div className="afp-add-card__title">New Field</div>
          <FieldForm draft={newDraft} setDraft={fn => setNewDraft(d => fn(d) as NewFieldDraft)} />
          <div className="afp-add-card__footer">
            <button className="afp-btn afp-btn--ghost afp-btn--sm" type="button" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="afp-btn afp-btn--primary afp-btn--sm" type="button" disabled={!newDraft.label.trim() || saving}
              onClick={() => void addField()}>
              {saving ? "Saving…" : "Add Field"}
            </button>
          </div>
        </div>
      )}

      <div className="afp-fields">
        {localFields.length === 0 && (
          <div className="afp-fields-empty">
            <p>No fields yet.{!readonly && " Use \"Add Field\" to get started."}</p>
          </div>
        )}
        {localFields.map((field, index) => (
          <div
            key={field.id}
            className={[
              "afp-field-row",
              editingId === field.id ? "afp-field-row--editing" : "",
              !field.is_enabled ? "afp-field-row--disabled" : "",
              dragOver === index && dragFrom !== index ? "afp-field-row--drag-over" : "",
              readonly ? "afp-field-row--readonly" : "",
            ].filter(Boolean).join(" ")}
            onDragOver={e => { if (dragFrom === null || saving || readonly) return; e.preventDefault(); if (dragOver !== index) setDragOver(index); }}
            onDrop={e => { e.preventDefault(); void handleDrop(index); }}
          >
            {!readonly && (
              <div className="afp-drag-handle" draggable={!saving}
                onDragStart={e => { if (saving) return; setDragFrom(index); setDragOver(index); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(index)); }}
                onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                title="Drag to reorder">
                <GripIcon />
              </div>
            )}

            <div className="afp-field-body">
              <div className="afp-field-head">
                <span className="afp-field-label">{field.label}</span>
                <div className="afp-field-badges">
                  <span className="afp-badge afp-badge--type">{FIELD_TYPE_LABELS[field.type] ?? field.type}</span>
                  {field.required && <span className="afp-badge afp-badge--required">Required</span>}
                  {!field.is_enabled && <span className="afp-badge afp-badge--disabled">Disabled</span>}
                </div>
              </div>
              <div className="afp-field-meta">
                <code className="afp-field-name-code">{field.name}</code>
                {field.placeholder && <span className="afp-field-placeholder"> · "{field.placeholder}"</span>}
                {(field.min_length != null || field.max_length != null) && (
                  <span className="afp-field-lengths">
                    {[field.min_length != null ? `min ${field.min_length}` : null, field.max_length != null ? `max ${field.max_length}` : null].filter(Boolean).join(" – ")}
                  </span>
                )}
                {field.options.length > 0 && (
                  <span className="afp-field-opts">{field.options.map(o => o.label).join(" · ")}</span>
                )}
              </div>

              {editingId === field.id && editDraft && !readonly && (
                <div className="afp-inline-edit">
                  <FieldForm draft={editDraft} setDraft={fn => setEditDraft(d => d ? fn(d) as FieldEditDraft : d)} />
                  <div className="afp-inline-edit__footer">
                    <div className="afp-inline-edit__actions">
                      <button className="afp-btn afp-btn--icon afp-btn--ghost" type="button" disabled={index === 0 || saving} onClick={() => void moveField(index, -1)} title="Move up">↑</button>
                      <button className="afp-btn afp-btn--icon afp-btn--ghost" type="button" disabled={index === localFields.length - 1 || saving} onClick={() => void moveField(index, 1)} title="Move down">↓</button>
                      <button className="afp-btn afp-btn--sm afp-btn--primary" type="button" disabled={saving || !editDraft?.label.trim()} onClick={() => void saveEdit(field.id)}>
                        <CheckIcon /> {saving ? "Saving…" : "Save Changes"}
                      </button>
                      <button className="afp-btn afp-btn--sm afp-btn--ghost" type="button" disabled={saving} onClick={() => { setEditingId(null); setEditDraft(null); }}>Cancel</button>
                      <button className="afp-btn afp-btn--icon afp-btn--ghost afp-btn--danger" type="button" disabled={saving} onClick={() => void deleteField(field.id, field.label)} title="Delete"><TrashIcon /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {editingId !== field.id && !readonly && (
              <div className="afp-field-actions">
                <button className="afp-btn afp-btn--icon afp-btn--ghost" type="button" disabled={index === 0 || saving} onClick={() => void moveField(index, -1)} title="Move up">↑</button>
                <button className="afp-btn afp-btn--icon afp-btn--ghost" type="button" disabled={index === localFields.length - 1 || saving} onClick={() => void moveField(index, 1)} title="Move down">↓</button>
                <button className="afp-btn afp-btn--icon afp-btn--ghost" type="button" disabled={saving} onClick={() => startEdit(field)} title="Edit"><EditIcon /></button>
                <button className="afp-btn afp-btn--icon afp-btn--ghost afp-btn--danger" type="button" disabled={saving} onClick={() => void deleteField(field.id, field.label)} title="Delete"><TrashIcon /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!readonly && localFields.length > 0 && (
        <p className="afp-autosave-note">{saving ? "Saving changes…" : "Changes save automatically."}</p>
      )}
    </div>
  );
}

// ─── Start-mode modal (shared) ────────────────────────────────────────────────

function StartModal({ entityLabel, onStart, onClose }: { entityLabel: string; onStart: (mode: StartMode) => void; onClose: () => void }) {
  return (
    <div className="afp-start-modal">
      <div className="afp-start-modal__title">How do you want to start?</div>
      <p className="afp-start-modal__desc">Choose a starting point for <strong>{entityLabel}</strong>'s custom application form.</p>
      <div className="afp-start-modal__options">
        <button className="afp-start-option" type="button" onClick={() => onStart("copy")}>
          <div className="afp-start-option__icon"><CopyIcon /></div>
          <strong>Copy from General Form</strong>
          <span>Start with all the general form fields pre-loaded, then customize.</span>
        </button>
        <button className="afp-start-option" type="button" onClick={() => onStart("blank")}>
          <div className="afp-start-option__icon"><PlusIcon /></div>
          <strong>Start with Blank Form</strong>
          <span>Start from scratch and build your own field set.</span>
        </button>
      </div>
      <button className="afp-btn afp-btn--ghost afp-btn--sm" type="button" onClick={onClose}>Cancel</button>
    </div>
  );
}

// ─── GeneralFormTab ───────────────────────────────────────────────────────────

function GeneralFormTab() {
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();
  const [form, setForm] = useState<FormMeta | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await api<FormMeta>("/forms/general");
      setForm(data); setFields(mapFields(data.fields ?? []));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load general form."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (error) {
      pushToast("error", error);
    }
  }, [error, pushToast]);

  const handleSave = async (nextFields: EditableField[]) => {
    if (!form) return;
    setSaving(true); setError("");
    try {
      const updated = await api<FormMeta>("/forms/general", {
        method: "PUT",
        body: JSON.stringify({ title: form.title, description: form.description, is_active: form.is_active, fields: toPayloadFields(nextFields) }),
      });
      setForm(updated); setFields(mapFields(updated.fields ?? []));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save."); await load(); }
    finally { setSaving(false); }
  };

  if (loading) return <PulseDots padding={32} label="Loading" />;

  return (
    <div className="afp-tab-content">
      <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      <div className="afp-tab-header">
        <div>
          <h2 className="afp-section-title">General Application Form</h2>
          <p className="afp-section-desc">The default form used by all programs and cohorts unless they have a custom override.</p>
        </div>
        <span className="afp-form-mode-badge afp-form-mode-badge--general">Default</span>
      </div>
      <FieldEditor fields={fields} saving={saving} onSave={handleSave} onReload={load} />
    </div>
  );
}

// ─── ProgramFormTab ───────────────────────────────────────────────────────────

function ProgramFormTab() {
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [programsError, setProgramsError] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [programForm, setProgramForm] = useState<ProgramFormResponse | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [showStartModal, setShowStartModal] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoadingPrograms(true); setProgramsError("");
      try {
        const result = await api<ProgramOption[]>("/forms/programs/options");
        const rows = Array.isArray(result) ? result : [];
        setPrograms(rows);
        if (rows.length) setSelectedProgramId(rows[0].id);
      } catch (e) { setProgramsError(e instanceof Error ? e.message : "Failed to load programs."); }
      finally { setLoadingPrograms(false); }
    };
    void run();
  }, []);

  const loadProgramForm = useCallback(async (programId: number) => {
    setLoadingForm(true); setFormError(""); setProgramForm(null); setSaveSuccess("");
    try {
      const data = await api<ProgramFormResponse>(`/forms/programs/${programId}`);
      setProgramForm(data);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to load program form."); }
    finally { setLoadingForm(false); }
  }, []);

  useEffect(() => { if (selectedProgramId) void loadProgramForm(selectedProgramId); }, [selectedProgramId, loadProgramForm]);

  useEffect(() => {
    if (programsError) {
      pushToast("error", programsError);
    }
  }, [programsError, pushToast]);

  useEffect(() => {
    if (formError) {
      pushToast("error", formError);
    }
  }, [formError, pushToast]);

  useEffect(() => {
    if (saveSuccess) {
      pushToast("success", saveSuccess);
    }
  }, [pushToast, saveSuccess]);

  const resetToGeneral = async () => {
    if (!selectedProgramId) return;
    setSaving(true); setFormError(""); setSaveSuccess("");
    try {
      const data = await api<ProgramFormResponse>(`/forms/programs/${selectedProgramId}`, { method: "PUT", body: JSON.stringify({ mode: "general" }) });
      setProgramForm(data); setSaveSuccess("Program reset to general form.");
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to reset."); }
    finally { setSaving(false); }
  };

  const startCustomize = async (mode: StartMode) => {
    if (!selectedProgramId || !programForm) return;
    setShowStartModal(false); setSaving(true); setFormError(""); setSaveSuccess("");
    try {
      const baseFields = mode === "copy" ? toPayloadFields(mapFields(programForm.general_form.fields ?? [])) : [];
      const data = await api<ProgramFormResponse>(`/forms/programs/${selectedProgramId}`, {
        method: "PUT",
        body: JSON.stringify({ mode: "custom", form: { title: programForm.suggested_custom_form?.title ?? `${programForm.program.title} Application`, description: null, is_active: true, fields: baseFields } }),
      });
      setProgramForm(data); setSaveSuccess(mode === "copy" ? "Custom form created from general form." : "Blank custom form created.");
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to create."); }
    finally { setSaving(false); }
  };

  const handleSaveFields = async (nextFields: EditableField[]) => {
    if (!selectedProgramId || !programForm) return;
    setSaving(true); setFormError(""); setSaveSuccess("");
    try {
      const data = await api<ProgramFormResponse>(`/forms/programs/${selectedProgramId}`, {
        method: "PUT",
        body: JSON.stringify({ mode: "custom", form: { title: programForm.custom_form?.title ?? programForm.suggested_custom_form?.title, description: programForm.custom_form?.description ?? null, is_active: true, fields: toPayloadFields(nextFields) } }),
      });
      setProgramForm(data); setSaveSuccess("Custom form saved.");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save.");
      if (selectedProgramId) await loadProgramForm(selectedProgramId);
    } finally { setSaving(false); }
  };

  const activeProgram = programs.find(p => p.id === selectedProgramId);
  const hasCustom = Boolean(programForm?.custom_form);
  const isUsingGeneral = !hasCustom;

  return (
    <div className="afp-tab-content">
      <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      <div className="afp-tab-header">
        <div>
          <h2 className="afp-section-title">Program Forms</h2>
          <p className="afp-section-desc">Each program can have its own custom application form, or fall back to the general form.</p>
        </div>
      </div>
      {loadingPrograms ? (
        <PulseDots padding={32} label="Loading" />
      ) : programs.length === 0 ? (
        <div className="afp-state">No programs found.</div>
      ) : (
        <div className="afp-cohort-layout">
          <aside className="afp-cohort-sidebar">
            <div className="afp-cohort-sidebar__label">Programs</div>
            {programs.map(p => (
              <button key={p.id} type="button"
                className={["afp-cohort-item", p.id === selectedProgramId ? "afp-cohort-item--active" : ""].join(" ")}
                onClick={() => setSelectedProgramId(p.id)}>
                <span className="afp-cohort-item__name">{p.title}</span>
                <span className={["afp-cohort-item__badge", p.use_general_form ? "" : "afp-cohort-item__badge--custom"].join(" ")}>
                  {p.use_general_form ? "General" : "Custom"}
                </span>
              </button>
            ))}
          </aside>
          <div className="afp-cohort-panel">
            {loadingForm && <PulseDots padding={32} label="Loading" />}
            {programForm && activeProgram && !loadingForm && (
              <>
                <div className="afp-cohort-header">
                  <div>
                    <h3 className="afp-cohort-name">{activeProgram.title}</h3>
                    <p className="afp-cohort-program">{activeProgram.is_published ? "Published" : "Unpublished"} program</p>
                  </div>
                  <div className="afp-cohort-controls">
                    <span className={["afp-form-mode-badge", isUsingGeneral ? "afp-form-mode-badge--general" : "afp-form-mode-badge--custom"].join(" ")}>
                      {isUsingGeneral ? "Using General Form" : "Custom Form"}
                    </span>
                    {!isUsingGeneral && (
                      <button className="afp-btn afp-btn--outline afp-btn--sm" type="button" disabled={saving} onClick={() => void resetToGeneral()}>Reset to General</button>
                    )}
                    {isUsingGeneral && (
                      <button className="afp-btn afp-btn--primary afp-btn--sm" type="button" disabled={saving} onClick={() => setShowStartModal(true)}>Customize</button>
                    )}
                  </div>
                </div>
                {showStartModal && <StartModal entityLabel={activeProgram.title} onStart={startCustomize} onClose={() => setShowStartModal(false)} />}
                {isUsingGeneral && !showStartModal && (
                  <div className="afp-info-banner">
                    <span>This program uses the general application form. Click "Customize" to create a program-specific form.</span>
                  </div>
                )}
                <FieldEditor
                  fields={mapFields(hasCustom ? (programForm.custom_form?.fields ?? []) : (programForm.general_form?.fields ?? []))}
                  saving={saving} readonly={isUsingGeneral}
                  onSave={handleSaveFields}
                  onReload={() => loadProgramForm(activeProgram.id)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CohortFormTab ────────────────────────────────────────────────────────────

function CohortFormTab() {
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [cohortsError, setCohortsError] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [cohortForm, setCohortForm] = useState<CohortFormResponse | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [showStartModal, setShowStartModal] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoadingCohorts(true); setCohortsError("");
      try {
        const result = await api<CohortOption[]>("/forms/cohorts/options");
        const rows = Array.isArray(result) ? result : [];
        setCohorts(rows);
        if (rows.length) setSelectedCohortId(rows[0].id);
      } catch (e) { setCohortsError(e instanceof Error ? e.message : "Failed to load cohorts."); }
      finally { setLoadingCohorts(false); }
    };
    void run();
  }, []);

  const loadCohortForm = useCallback(async (cohortId: number) => {
    setLoadingForm(true); setFormError(""); setCohortForm(null); setSaveSuccess("");
    try {
      const data = await api<CohortFormResponse>(`/forms/cohorts/${cohortId}`);
      setCohortForm(data);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to load cohort form."); }
    finally { setLoadingForm(false); }
  }, []);

  useEffect(() => { if (selectedCohortId) void loadCohortForm(selectedCohortId); }, [selectedCohortId, loadCohortForm]);

  useEffect(() => {
    if (cohortsError) {
      pushToast("error", cohortsError);
    }
  }, [cohortsError, pushToast]);

  useEffect(() => {
    if (formError) {
      pushToast("error", formError);
    }
  }, [formError, pushToast]);

  useEffect(() => {
    if (saveSuccess) {
      pushToast("success", saveSuccess);
    }
  }, [pushToast, saveSuccess]);

  const resetToGeneral = async () => {
    if (!selectedCohortId) return;
    setSaving(true); setFormError(""); setSaveSuccess("");
    try {
      const data = await api<CohortFormResponse>(`/forms/cohorts/${selectedCohortId}`, { method: "PUT", body: JSON.stringify({ mode: "general" }) });
      setCohortForm(data); setSaveSuccess("Cohort reset to general form.");
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed."); }
    finally { setSaving(false); }
  };

  const startCustomize = async (mode: StartMode) => {
    if (!selectedCohortId || !cohortForm) return;
    setShowStartModal(false); setSaving(true); setFormError(""); setSaveSuccess("");
    try {
      const baseFields = mode === "copy" ? toPayloadFields(mapFields(cohortForm.general_form.fields ?? [])) : [];
      const data = await api<CohortFormResponse>(`/forms/cohorts/${selectedCohortId}`, {
        method: "PUT",
        body: JSON.stringify({ mode: "custom", form: { title: cohortForm.suggested_custom_form.title, description: null, is_active: true, fields: baseFields } }),
      });
      setCohortForm(data); setSaveSuccess(mode === "copy" ? "Custom form created from general form." : "Blank custom form created.");
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed."); }
    finally { setSaving(false); }
  };

  const handleSaveFields = async (nextFields: EditableField[]) => {
    if (!selectedCohortId || !cohortForm) return;
    setSaving(true); setFormError(""); setSaveSuccess("");
    try {
      const data = await api<CohortFormResponse>(`/forms/cohorts/${selectedCohortId}`, {
        method: "PUT",
        body: JSON.stringify({ mode: "custom", form: { title: cohortForm.suggested_custom_form.title, description: cohortForm.custom_form?.description ?? null, is_active: true, fields: toPayloadFields(nextFields) } }),
      });
      setCohortForm(data); setSaveSuccess("Custom form saved.");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed.");
      if (selectedCohortId) await loadCohortForm(selectedCohortId);
    } finally { setSaving(false); }
  };

  const activeCohort = cohorts.find(c => c.id === selectedCohortId);
  const hasCustom = Boolean(cohortForm?.custom_form);
  const isUsingGeneral = !hasCustom;

  return (
    <div className="afp-tab-content">
      <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      <div className="afp-tab-header">
        <div>
          <h2 className="afp-section-title">Cohort Forms</h2>
          <p className="afp-section-desc">Each cohort can have its own custom form, or fall back to the general form.</p>
        </div>
      </div>
      {loadingCohorts ? (
        <PulseDots padding={32} label="Loading" />
      ) : cohorts.length === 0 ? (
        <div className="afp-state">No cohorts found.</div>
      ) : (
        <div className="afp-cohort-layout">
          <aside className="afp-cohort-sidebar">
            <div className="afp-cohort-sidebar__label">Cohorts</div>
            {cohorts.map(c => (
              <button key={c.id} type="button"
                className={["afp-cohort-item", c.id === selectedCohortId ? "afp-cohort-item--active" : ""].join(" ")}
                onClick={() => setSelectedCohortId(c.id)}>
                <span className="afp-cohort-item__name">{c.name}</span>
                <span className="afp-cohort-item__program">{c.program_title}</span>
                <span className={["afp-cohort-item__badge", c.use_general_form ? "" : "afp-cohort-item__badge--custom"].join(" ")}>
                  {c.use_general_form ? "General" : "Custom"}
                </span>
              </button>
            ))}
          </aside>
          <div className="afp-cohort-panel">
            {loadingForm && <PulseDots padding={32} label="Loading" />}
            {cohortForm && activeCohort && !loadingForm && (
              <>
                <div className="afp-cohort-header">
                  <div>
                    <h3 className="afp-cohort-name">{activeCohort.name}</h3>
                    <p className="afp-cohort-program">{activeCohort.program_title}</p>
                  </div>
                  <div className="afp-cohort-controls">
                    <span className={["afp-form-mode-badge", isUsingGeneral ? "afp-form-mode-badge--general" : "afp-form-mode-badge--custom"].join(" ")}>
                      {isUsingGeneral ? "Using General Form" : "Custom Form"}
                    </span>
                    {!isUsingGeneral && (
                      <button className="afp-btn afp-btn--outline afp-btn--sm" type="button" disabled={saving} onClick={() => void resetToGeneral()}>Reset to General</button>
                    )}
                    {isUsingGeneral && (
                      <button className="afp-btn afp-btn--primary afp-btn--sm" type="button" disabled={saving} onClick={() => setShowStartModal(true)}>Customize</button>
                    )}
                  </div>
                </div>
                {showStartModal && <StartModal entityLabel={activeCohort.name} onStart={startCustomize} onClose={() => setShowStartModal(false)} />}
                {isUsingGeneral && !showStartModal && (
                  <div className="afp-info-banner">
                    <span>This cohort uses the general application form. Click "Customize" to create a cohort-specific form.</span>
                  </div>
                )}
                <FieldEditor
                  fields={mapFields(hasCustom ? (cohortForm.custom_form?.fields ?? []) : (cohortForm.general_form?.fields ?? []))}
                  saving={saving} readonly={isUsingGeneral}
                  onSave={handleSaveFields}
                  onReload={() => loadCohortForm(activeCohort.id)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ApplicationFormsPage() {
  const [activeTab, setActiveTab] = useState<PageTab>("general");

  const TABS = [
    { id: "general" as PageTab, label: "General Form",   desc: "Default fallback" },
    { id: "program" as PageTab, label: "Program Forms",  desc: "Per-program overrides" },
    { id: "cohort"  as PageTab, label: "Cohort Forms",   desc: "Per-cohort overrides" },
  ];

  return (
    <div className="afp-page">
      <header className="afp-topnav">
        <nav className="afp-tabs" aria-label="Application Forms tabs">
          {TABS.map(tab => (
            <button key={tab.id} type="button"
              className={activeTab === tab.id ? "afp-tab afp-tab--active" : "afp-tab"}
              onClick={() => setActiveTab(tab.id)}>
              <span className="afp-tab__label">{tab.label}</span>
              <span className="afp-tab__desc">{tab.desc}</span>
            </button>
          ))}
        </nav>
      </header>
      <main className="afp-main">
        {activeTab === "general" && <GeneralFormTab />}
        {activeTab === "program" && <ProgramFormTab />}
        {activeTab === "cohort"  && <CohortFormTab />}
      </main>
    </div>
  );
}
