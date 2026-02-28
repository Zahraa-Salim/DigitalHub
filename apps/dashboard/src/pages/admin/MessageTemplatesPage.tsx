import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import {
  createMessageTemplate,
  type MessageTemplate,
  type MessageTemplateChannel,
  listMessageTemplates,
  updateMessageTemplate,
} from "../../lib/api";
import { ApiError } from "../../utils/api";
import "./MessageTemplatesPage.css";

type TemplateDraft = {
  label: string;
  description: string;
  channel: MessageTemplateChannel;
  subject: string;
  body: string;
  is_active: boolean;
  sort_order: number;
};

type CreateTemplateDraft = {
  key: string;
  label: string;
  description: string;
  channel: MessageTemplateChannel;
  subject: string;
  body: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_CREATE_DRAFT: CreateTemplateDraft = {
  key: "",
  label: "",
  description: "",
  channel: "all",
  subject: "",
  body: "Hello {name},\n\n\n\nBest regards,\nDigital Hub Team",
  is_active: true,
  sort_order: 0,
};

function toDraft(template: MessageTemplate): TemplateDraft {
  return {
    label: template.label,
    description: template.description ?? "",
    channel: template.channel,
    subject: template.subject ?? "",
    body: template.body,
    is_active: template.is_active,
    sort_order: template.sort_order,
  };
}

export function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [draftsByKey, setDraftsByKey] = useState<Record<string, TemplateDraft>>({});
  const [activeKey, setActiveKey] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateTemplateDraft>(EMPTY_CREATE_DRAFT);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    [templates],
  );

  const activeTemplate = useMemo(
    () => sortedTemplates.find((template) => template.key === activeKey) ?? sortedTemplates[0] ?? null,
    [sortedTemplates, activeKey],
  );

  const activeDraft = useMemo(
    () => (activeTemplate ? draftsByKey[activeTemplate.key] ?? toDraft(activeTemplate) : null),
    [activeTemplate, draftsByKey],
  );

  const loadTemplates = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await listMessageTemplates({ include_inactive: true });
      setTemplates(data);
      setDraftsByKey(
        data.reduce<Record<string, TemplateDraft>>((accumulator, template) => {
          accumulator[template.key] = toDraft(template);
          return accumulator;
        }, {}),
      );
      if (data.length) {
        setActiveKey((current) => current || data[0].key);
      } else {
        setActiveKey("");
      }
    } catch (err) {
      setTemplates([]);
      setDraftsByKey({});
      setActiveKey("");
      setError(err instanceof ApiError ? err.message : "Failed to load message templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    if (!sortedTemplates.length) return;
    if (!activeKey || !sortedTemplates.some((template) => template.key === activeKey)) {
      setActiveKey(sortedTemplates[0].key);
    }
  }, [sortedTemplates, activeKey]);

  const setDraftField = <K extends keyof TemplateDraft>(key: string, field: K, value: TemplateDraft[K]) => {
    setDraftsByKey((current) => {
      const existing = current[key];
      if (!existing) return current;
      return {
        ...current,
        [key]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const saveActiveTemplate = async () => {
    if (!activeTemplate || !activeDraft) return;
    setSavingKey(activeTemplate.key);
    setError("");
    setSuccess("");
    try {
      const updated = await updateMessageTemplate(activeTemplate.key, {
        label: activeDraft.label.trim(),
        description: activeDraft.description.trim() || null,
        channel: activeDraft.channel,
        subject: activeDraft.subject.trim() || null,
        body: activeDraft.body,
        is_active: activeDraft.is_active,
        sort_order: Number.isFinite(activeDraft.sort_order) ? activeDraft.sort_order : activeTemplate.sort_order,
      });
      setTemplates((current) => current.map((entry) => (entry.key === updated.key ? updated : entry)));
      setDraftsByKey((current) => ({
        ...current,
        [updated.key]: toDraft(updated),
      }));
      setSuccess(`Template '${updated.label}' saved.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save message template.");
    } finally {
      setSavingKey(null);
    }
  };

  const createTemplate = async () => {
    if (!createDraft.label.trim() || !createDraft.body.trim()) return;
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const created = await createMessageTemplate({
        key: createDraft.key.trim() || undefined,
        label: createDraft.label.trim(),
        description: createDraft.description.trim() || null,
        channel: createDraft.channel,
        subject: createDraft.subject.trim() || null,
        body: createDraft.body,
        is_active: createDraft.is_active,
        sort_order: Number.isFinite(createDraft.sort_order) ? createDraft.sort_order : 0,
      });
      setTemplates((current) => [...current, created]);
      setDraftsByKey((current) => ({
        ...current,
        [created.key]: toDraft(created),
      }));
      setActiveKey(created.key);
      setShowCreate(false);
      setCreateDraft(EMPTY_CREATE_DRAFT);
      setSuccess(`Template '${created.label}' created.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create message template.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageShell
      title="Message Templates"
      subtitle="Manage reusable templates used across Admissions, General Apply, and global messaging."
      actions={
        <div className="mtpl-top-actions">
          <button className="btn btn--secondary" type="button" onClick={() => void loadTemplates()} disabled={loading}>
            Refresh
          </button>
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => {
              setShowCreate((current) => !current);
              setError("");
              setSuccess("");
            }}
          >
            {showCreate ? "Close Add Template" : "Add Template"}
          </button>
        </div>
      }
    >
      {error ? <Card><p className="alert alert--danger">{error}</p></Card> : null}
      {success ? <Card><p className="alert alert--success">{success}</p></Card> : null}
      {loading ? <Card><p className="info-text">Loading templates...</p></Card> : null}

      {!loading ? (
        <>
          {showCreate ? (
            <Card className="mtpl-create-card">
              <div className="mtpl-panel-head">
                <div>
                  <h3 className="section-title">Create New Template</h3>
                  <p className="info-text">Add a reusable message template for email/WhatsApp composers.</p>
                </div>
              </div>

              <div className="mtpl-editor-grid">
                <label className="field">
                  <span className="field__label">Template Title</span>
                  <input
                    className="field__control"
                    value={createDraft.label}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Interview Reminder"
                  />
                </label>

                <label className="field">
                  <span className="field__label">Template Key (optional)</span>
                  <input
                    className="field__control"
                    value={createDraft.key}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, key: event.target.value }))}
                    placeholder="interview_reminder"
                  />
                </label>

                <label className="field">
                  <span className="field__label">Channel</span>
                  <select
                    className="field__control"
                    value={createDraft.channel}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, channel: event.target.value as MessageTemplateChannel }))}
                  >
                    <option value="all">All</option>
                    <option value="email">Email</option>
                    <option value="sms">WhatsApp</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Sort Order</span>
                  <input
                    className="field__control"
                    type="number"
                    min={0}
                    step={1}
                    value={String(createDraft.sort_order)}
                    onChange={(event) => {
                      const numeric = Number(event.target.value);
                      setCreateDraft((current) => ({ ...current, sort_order: Number.isFinite(numeric) ? numeric : 0 }));
                    }}
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">Description</span>
                  <input
                    className="field__control"
                    value={createDraft.description}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="When and where this template should be used."
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">Email Subject</span>
                  <input
                    className="field__control"
                    value={createDraft.subject}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, subject: event.target.value }))}
                    placeholder="Interview Invitation"
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">Message Body</span>
                  <textarea
                    className="textarea-control"
                    rows={8}
                    value={createDraft.body}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, body: event.target.value }))}
                  />
                </label>

                <label className="checkbox-row field--full">
                  <input
                    type="checkbox"
                    checked={createDraft.is_active}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, is_active: event.target.checked }))}
                  />
                  <span>Active template</span>
                </label>
              </div>

              <div className="mtpl-panel-actions">
                <button className="btn btn--secondary" type="button" onClick={() => setShowCreate(false)} disabled={creating}>
                  Cancel
                </button>
                <button
                  className="btn btn--primary"
                  type="button"
                  onClick={() => void createTemplate()}
                  disabled={creating || !createDraft.label.trim() || !createDraft.body.trim()}
                >
                  {creating ? "Creating..." : "Create Template"}
                </button>
              </div>
            </Card>
          ) : null}

          <Card className="mtpl-tabs-card">
            <div className="mtpl-tabs" role="tablist" aria-label="Message template titles">
              {sortedTemplates.map((template) => (
                <button
                  key={template.key}
                  className={activeTemplate?.key === template.key ? "mtpl-tab mtpl-tab--active" : "mtpl-tab"}
                  type="button"
                  role="tab"
                  aria-selected={activeTemplate?.key === template.key}
                  onClick={() => setActiveKey(template.key)}
                >
                  <span className="mtpl-tab__title">{template.label}</span>
                  <span className="mtpl-tab__key">{template.key}</span>
                </button>
              ))}
            </div>
          </Card>

          {activeTemplate && activeDraft ? (
            <Card className="mtpl-editor-card">
              <div className="mtpl-panel-head">
                <div>
                  <h3 className="section-title">{activeTemplate.label}</h3>
                  <p className="info-text">Key: {activeTemplate.key}</p>
                </div>
                <button
                  className="btn btn--primary"
                  type="button"
                  onClick={() => void saveActiveTemplate()}
                  disabled={savingKey === activeTemplate.key || !activeDraft.label.trim() || !activeDraft.body.trim()}
                >
                  {savingKey === activeTemplate.key ? "Saving..." : "Save Changes"}
                </button>
              </div>

              <div className="mtpl-editor-grid">
                <label className="field">
                  <span className="field__label">Template Title</span>
                  <input
                    className="field__control"
                    value={activeDraft.label}
                    onChange={(event) => setDraftField(activeTemplate.key, "label", event.target.value)}
                  />
                </label>

                <label className="field">
                  <span className="field__label">Channel</span>
                  <select
                    className="field__control"
                    value={activeDraft.channel}
                    onChange={(event) => setDraftField(activeTemplate.key, "channel", event.target.value as MessageTemplateChannel)}
                  >
                    <option value="all">All</option>
                    <option value="email">Email</option>
                    <option value="sms">WhatsApp</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Sort Order</span>
                  <input
                    className="field__control"
                    type="number"
                    min={0}
                    step={1}
                    value={String(activeDraft.sort_order)}
                    onChange={(event) => {
                      const numeric = Number(event.target.value);
                      setDraftField(activeTemplate.key, "sort_order", Number.isFinite(numeric) ? numeric : 0);
                    }}
                  />
                </label>

                <label className="checkbox-row mtpl-checkbox">
                  <input
                    type="checkbox"
                    checked={activeDraft.is_active}
                    onChange={(event) => setDraftField(activeTemplate.key, "is_active", event.target.checked)}
                  />
                  <span>Active template</span>
                </label>

                <label className="field field--full">
                  <span className="field__label">Description</span>
                  <input
                    className="field__control"
                    value={activeDraft.description}
                    onChange={(event) => setDraftField(activeTemplate.key, "description", event.target.value)}
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">Email Subject</span>
                  <input
                    className="field__control"
                    value={activeDraft.subject}
                    onChange={(event) => setDraftField(activeTemplate.key, "subject", event.target.value)}
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">Message Body</span>
                  <textarea
                    className="textarea-control"
                    rows={10}
                    value={activeDraft.body}
                    onChange={(event) => setDraftField(activeTemplate.key, "body", event.target.value)}
                  />
                </label>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
