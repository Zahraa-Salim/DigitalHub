import { useEffect, useMemo, useRef, useState } from "react";
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
import { useNavigate } from "react-router-dom";
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

type StaticLinkInfo = {
  token: string;
  purpose: string;
  dynamicValue: string;
};

type TokenInfo = {
  token: string;
  purpose: string;
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

const STATIC_LINKS: StaticLinkInfo[] = [
  {
    token: "{confirm_url}",
    purpose: "Interview confirmation link sent to the applicant.",
    dynamicValue: "{PUBLIC_API_BASE_URL}/public/interviews/{confirm_token}/confirm",
  },
  {
    token: "{reschedule_url}",
    purpose: "Interview reschedule link sent to the applicant.",
    dynamicValue: "{PUBLIC_API_BASE_URL}/public/interviews/{confirm_token}/reschedule",
  },
  {
    token: "{participation_confirm_url}",
    purpose: "Participation confirmation link after acceptance.",
    dynamicValue: "{PUBLIC_API_BASE_URL}/public/participation/{participation_token}/confirm",
  },
  {
    token: "{sign_in_url}",
    purpose: "Learner sign-in URL for account credentials messages.",
    dynamicValue: "{LEARNER_SIGNIN_URL | STUDENT_SIGNIN_URL | PUBLIC_STUDENT_SIGNIN_URL}",
  },
];

const COMMON_TOKENS: TokenInfo[] = [
  { token: "{name}", purpose: "Recipient full name." },
  { token: "{status}", purpose: "Application status label." },
  { token: "{time}", purpose: "Interview or event time." },
];

const PREVIEW_TOKEN_VALUES: Record<string, string> = {
  "{name}": "Sarah Khoury",
  "{status}": "participation confirmed",
  "{time}": "Tuesday, 5:30 PM",
  "{confirm_url}": "https://example.com/public/interviews/cf_123/confirm",
  "{reschedule_url}": "https://example.com/public/interviews/cf_123/reschedule",
  "{participation_confirm_url}": "https://example.com/public/participation/pt_123/confirm",
  "{sign_in_url}": "https://example.com/login",
};

function normalizeMessageBody(input: string): string {
  const normalizedEscapes = input.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
  return normalizedEscapes.replace(
    /(^|[\s,.;:!?()[\]{}-])\/n(?=($|[\s,.;:!?()[\]{}-]|[A-Z]))/g,
    (_match, prefix: string) => `${prefix}\n`,
  );
}

function toDraft(template: MessageTemplate): TemplateDraft {
  return {
    label: template.label,
    description: template.description ?? "",
    channel: template.channel,
    subject: template.subject ?? "",
    body: normalizeMessageBody(template.body),
    is_active: template.is_active,
    sort_order: template.sort_order,
  };
}

function isDraftDirty(template: MessageTemplate, draft: TemplateDraft | undefined): boolean {
  if (!draft) return false;
  const original = toDraft(template);
  return (
    original.label !== draft.label ||
    original.description !== draft.description ||
    original.channel !== draft.channel ||
    original.subject !== draft.subject ||
    original.body !== draft.body ||
    original.is_active !== draft.is_active ||
    original.sort_order !== draft.sort_order
  );
}

function applyPreviewTokens(input: string): string {
  return Object.entries(PREVIEW_TOKEN_VALUES).reduce(
    (result, [token, value]) => result.split(token).join(value),
    input,
  );
}

function insertToken(value: string, token: string, start: number, end: number): { value: string; cursor: number } {
  return {
    value: `${value.slice(0, start)}${token}${value.slice(end)}`,
    cursor: start + token.length,
  };
}

export function MessageTemplatesPage() {
  const navigate = useNavigate();
  const activeBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const createBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [draftsByKey, setDraftsByKey] = useState<Record<string, TemplateDraft>>({});
  const [activeKey, setActiveKey] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showStaticLinks, setShowStaticLinks] = useState(false);
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

  const filteredTemplates = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return sortedTemplates;
    return sortedTemplates.filter((template) => {
      const label = template.label.toLowerCase();
      const key = template.key.toLowerCase();
      const body = template.body.toLowerCase();
      return label.includes(needle) || key.includes(needle) || body.includes(needle);
    });
  }, [sortedTemplates, searchTerm]);

  const activeTemplate = useMemo(
    () => filteredTemplates.find((template) => template.key === activeKey) ?? filteredTemplates[0] ?? null,
    [filteredTemplates, activeKey],
  );

  const activeDraft = useMemo(
    () => (activeTemplate ? draftsByKey[activeTemplate.key] ?? toDraft(activeTemplate) : null),
    [activeTemplate, draftsByKey],
  );

  const tokenList = useMemo<TokenInfo[]>(
    () => [
      ...COMMON_TOKENS,
      ...STATIC_LINKS.map((entry) => ({ token: entry.token, purpose: entry.purpose })),
    ],
    [],
  );

  const dirtyByKey = useMemo(
    () =>
      sortedTemplates.reduce<Record<string, boolean>>((accumulator, template) => {
        accumulator[template.key] = isDraftDirty(template, draftsByKey[template.key]);
        return accumulator;
      }, {}),
    [sortedTemplates, draftsByKey],
  );

  const dirtyCount = useMemo(() => Object.values(dirtyByKey).filter(Boolean).length, [dirtyByKey]);
  const activeIsDirty = activeTemplate ? dirtyByKey[activeTemplate.key] : false;

  const previewSubject = useMemo(() => {
    if (!activeDraft) return "";
    const source = activeDraft.subject.trim() ? activeDraft.subject : "(No subject)";
    return applyPreviewTokens(source);
  }, [activeDraft]);

  const previewBody = useMemo(
    () => (activeDraft ? applyPreviewTokens(activeDraft.body) : ""),
    [activeDraft],
  );

  const loadTemplates = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await listMessageTemplates({ include_inactive: true, limit: 100, sortBy: "sort_order", order: "asc" });
      const data = result.data;
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
    if (!filteredTemplates.length) return;
    if (!activeKey || !filteredTemplates.some((template) => template.key === activeKey)) {
      setActiveKey(filteredTemplates[0].key);
    }
  }, [filteredTemplates, activeKey]);

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

  const resetActiveDraft = () => {
    if (!activeTemplate) return;
    setDraftsByKey((current) => ({
      ...current,
      [activeTemplate.key]: toDraft(activeTemplate),
    }));
  };

  const insertCreateToken = (token: string) => {
    const control = createBodyRef.current;
    const start = control?.selectionStart ?? createDraft.body.length;
    const end = control?.selectionEnd ?? createDraft.body.length;
    const next = insertToken(createDraft.body, token, start, end);
    setCreateDraft((current) => ({ ...current, body: next.value }));
    window.setTimeout(() => {
      if (!createBodyRef.current) return;
      createBodyRef.current.focus();
      createBodyRef.current.setSelectionRange(next.cursor, next.cursor);
    }, 0);
  };

  const insertActiveToken = (token: string) => {
    if (!activeTemplate || !activeDraft) return;
    const control = activeBodyRef.current;
    const start = control?.selectionStart ?? activeDraft.body.length;
    const end = control?.selectionEnd ?? activeDraft.body.length;
    const next = insertToken(activeDraft.body, token, start, end);
    setDraftField(activeTemplate.key, "body", next.value);
    window.setTimeout(() => {
      if (!activeBodyRef.current) return;
      activeBodyRef.current.focus();
      activeBodyRef.current.setSelectionRange(next.cursor, next.cursor);
    }, 0);
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
        body: normalizeMessageBody(createDraft.body),
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
            className="btn btn--secondary"
            type="button"
            onClick={() => navigate("/admin/messages?status=sent&channel=email")}
          >
            Sent Emails
          </button>
          <button
            className="btn btn--secondary"
            type="button"
            onClick={() => navigate("/admin/messages?status=failed&channel=email")}
          >
            Failed Emails
          </button>
          <button className="btn btn--secondary" type="button" onClick={() => setShowStaticLinks((current) => !current)}>
            {showStaticLinks ? "Hide Static Links" : "Static Links"}
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
      {showStaticLinks ? (
        <Card className="mtpl-links-card">
          <div className="mtpl-panel-head">
            <div>
              <h3 className="section-title">Static Links (Read-only)</h3>
              <p className="info-text">
                These placeholders are generated dynamically when sending messages.
                Base URLs and tokens are resolved from current server configuration.
              </p>
            </div>
          </div>
          <div className="mtpl-links-table-wrap">
            <table className="mtpl-links-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Purpose</th>
                  <th>Dynamic Value Pattern</th>
                </tr>
              </thead>
              <tbody>
                {STATIC_LINKS.map((link) => (
                  <tr key={link.token}>
                    <td><code className="mtpl-token">{link.token}</code></td>
                    <td>{link.purpose}</td>
                    <td><code className="mtpl-pattern">{link.dynamicValue}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

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
                  <div className="mtpl-token-actions">
                    <span className="mtpl-token-actions__label">Insert token:</span>
                    {tokenList.map((token) => (
                      <button
                        key={token.token}
                        className="mtpl-token-btn"
                        type="button"
                        title={token.purpose}
                        onClick={() => insertCreateToken(token.token)}
                      >
                        {token.token}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="textarea-control"
                    rows={8}
                    ref={createBodyRef}
                    value={createDraft.body}
                    onChange={(event) =>
                      setCreateDraft((current) => ({ ...current, body: normalizeMessageBody(event.target.value) }))
                    }
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
            <div className="mtpl-tabs-head">
              <p className="info-text">
                {filteredTemplates.length} template{filteredTemplates.length === 1 ? "" : "s"}
                {searchTerm.trim() ? ` matching "${searchTerm.trim()}"` : ""}. {dirtyCount} unsaved.
              </p>
              <input
                className="field__control mtpl-search-input"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title, key, or content..."
              />
            </div>
            <div className="mtpl-tabs" role="tablist" aria-label="Message template titles">
              {filteredTemplates.map((template) => (
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
                  {dirtyByKey[template.key] ? <span className="mtpl-tab__dirty">Unsaved changes</span> : null}
                </button>
              ))}
            </div>
            {!filteredTemplates.length ? (
              <p className="info-text mtpl-empty-result">No templates match your search.</p>
            ) : null}
          </Card>

          {activeTemplate && activeDraft ? (
            <Card className="mtpl-editor-card">
              <div className="mtpl-panel-head">
                <div>
                  <h3 className="section-title">{activeTemplate.label}</h3>
                  <p className="info-text">Key: {activeTemplate.key}</p>
                </div>
                <div className="mtpl-panel-actions mtpl-panel-actions--inline">
                  <button
                    className="btn btn--secondary"
                    type="button"
                    onClick={resetActiveDraft}
                    disabled={!activeIsDirty || savingKey === activeTemplate.key}
                  >
                    Reset Changes
                  </button>
                  <button
                    className="btn btn--primary"
                    type="button"
                    onClick={() => void saveActiveTemplate()}
                    disabled={
                      savingKey === activeTemplate.key || !activeDraft.label.trim() || !activeDraft.body.trim() || !activeIsDirty
                    }
                  >
                    {savingKey === activeTemplate.key ? "Saving..." : "Save Changes"}
                  </button>
                </div>
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
                  <div className="mtpl-token-actions">
                    <span className="mtpl-token-actions__label">Insert token:</span>
                    {tokenList.map((token) => (
                      <button
                        key={token.token}
                        className="mtpl-token-btn"
                        type="button"
                        title={token.purpose}
                        onClick={() => insertActiveToken(token.token)}
                      >
                        {token.token}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="textarea-control"
                    rows={10}
                    ref={activeBodyRef}
                    value={activeDraft.body}
                    onChange={(event) => setDraftField(activeTemplate.key, "body", normalizeMessageBody(event.target.value))}
                  />
                </label>
              </div>

              <div className="mtpl-preview">
                <h4 className="mtpl-preview__title">Live Preview</h4>
                <p className="info-text">Preview uses sample values for known tokens.</p>
                <div className="mtpl-preview__block">
                  <span className="mtpl-preview__label">Subject</span>
                  <p className="mtpl-preview__content">{previewSubject}</p>
                </div>
                <div className="mtpl-preview__block">
                  <span className="mtpl-preview__label">Body</span>
                  <p className="mtpl-preview__content mtpl-preview__content--multiline">{previewBody}</p>
                </div>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
