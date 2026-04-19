// File: frontend/src/dashboard/pages/admin/MessageTemplatesPage.tsx
// Purpose: Renders the admin message templates page page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { PulseDots } from "../../components/PulseDots";
import { ToastStack } from "../../components/ToastStack";
import { useDashboardToasts } from "../../hooks/useDashboardToasts";
import {
  createMessageTemplate,
  type MessageTemplate,
  type MessageTemplateChannel,
  listMessageTemplates,
  updateMessageTemplate,
} from "../../lib/api";
import { ApiError } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { RichTextEditor } from "../../components/RichTextEditor";
import { getPlainTextFromHtml, insertTokenIntoEditor } from "../../components/RichTextEditor.utils";
import "../../styles/message-templates.css";

type TemplateDraft = {
  label: string;
  description: string;
  channel: MessageTemplateChannel;
  subject: string;
  body: string;
  body_html: string;
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
  body_html: string;
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
  body_html: "",
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

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textBodyToHtml(input: string): string {
  const normalized = normalizeMessageBody(input).trim();
  if (!normalized) return "";

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function normalizeHtmlForComparison(input: string): string {
  const html = input.trim();
  if (!html) return "";

  const container = document.createElement("div");
  container.innerHTML = html;
  return container.innerHTML.trim();
}

function slugifyTemplateKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toDraft(template: MessageTemplate): TemplateDraft {
  const normalizedBody = normalizeMessageBody(template.body);
  return {
    label: template.label,
    description: template.description ?? "",
    channel: template.channel,
    subject: template.subject ?? "",
    body: normalizedBody,
    body_html: template.body_html?.trim() || textBodyToHtml(normalizedBody),
    is_active: template.is_active,
    sort_order: template.sort_order,
  };
}

function isDraftDirty(template: MessageTemplate, draft: TemplateDraft | undefined): boolean {
  if (!draft) return false;
  const original = toDraft(template);
  const originalHtml = normalizeHtmlForComparison(original.body_html);
  const draftHtml = normalizeHtmlForComparison(draft.body_html);
  return (
    original.label !== draft.label ||
    original.description !== draft.description ||
    original.channel !== draft.channel ||
    original.subject !== draft.subject ||
    original.body !== draft.body ||
    originalHtml !== draftHtml ||
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

function handleTokenButtonClick(
  _event: React.MouseEvent<HTMLButtonElement>,
  insert: () => void,
) {
  insert();
}

export function MessageTemplatesPage() {
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();
  const navigate = useNavigate();
  const activeBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const createBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const activeEditorRef = useRef<Parameters<typeof insertTokenIntoEditor>[0] | null>(null);
  const createEditorRef = useRef<Parameters<typeof insertTokenIntoEditor>[0] | null>(null);
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

  const ensureRichDraftHtml = (draft: Pick<TemplateDraft, "body" | "body_html">) =>
    draft.body_html.trim() ? draft.body_html : textBodyToHtml(draft.body);

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
  const isCreateRte = createDraft.channel === "email" || createDraft.channel === "all";
  const isActiveRte = activeDraft ? activeDraft.channel === "email" || activeDraft.channel === "all" : false;

  const previewSubject = useMemo(() => {
    if (!activeDraft) return "";
    const source = activeDraft.subject.trim() ? activeDraft.subject : "(No subject)";
    return applyPreviewTokens(source);
  }, [activeDraft]);

  const previewBody = useMemo(
    () => (activeDraft ? applyPreviewTokens(activeDraft.body) : ""),
    [activeDraft],
  );
  const previewBodyHtml = useMemo(() => {
    if (!activeDraft) return "";
    if (isActiveRte) {
      return applyPreviewTokens(activeDraft.body_html || textBodyToHtml(activeDraft.body));
    }
    return "";
  }, [activeDraft, isActiveRte]);

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
    if (!templates.length) return;

    const id = window.setTimeout(() => {
      setDraftsByKey((current) => {
        const next = { ...current };
        templates.forEach((template) => {
          if (next[template.key]) {
            next[template.key] = toDraft(template);
          }
        });
        return next;
      });
    }, 50);

    return () => window.clearTimeout(id);
  }, [templates]);

  useEffect(() => {
    if (!filteredTemplates.length) return;
    if (!activeKey || !filteredTemplates.some((template) => template.key === activeKey)) {
      setActiveKey(filteredTemplates[0].key);
    }
  }, [filteredTemplates, activeKey]);

  useEffect(() => {
    if (error) {
      pushToast("error", error);
    }
  }, [error, pushToast]);

  useEffect(() => {
    if (success) {
      pushToast("success", success);
    }
  }, [pushToast, success]);

  useEffect(() => {
    activeEditorRef.current = null;
  }, [activeKey]);

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
        body: isActiveRte ? (getPlainTextFromHtml(activeDraft.body_html) || activeDraft.body) : activeDraft.body,
        body_html: isActiveRte && activeDraft.body_html.trim() ? activeDraft.body_html : undefined,
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
    if (isCreateRte && createEditorRef.current) {
      insertTokenIntoEditor(createEditorRef.current, token);
      return;
    }
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
    if (isActiveRte && activeEditorRef.current) {
      insertTokenIntoEditor(activeEditorRef.current, token);
      return;
    }
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
    const hasContent = isCreateRte ? getPlainTextFromHtml(createDraft.body_html).length > 0 : createDraft.body.trim().length > 0;
    if (!createDraft.label.trim() || !hasContent) return;
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
        body: isCreateRte ? getPlainTextFromHtml(createDraft.body_html) : normalizeMessageBody(createDraft.body),
        body_html: isCreateRte && createDraft.body_html ? createDraft.body_html : undefined,
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
      <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      {loading ? <Card><PulseDots padding={24} label="Loading templates" /></Card> : null}
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
                    onChange={(event) =>
                      setCreateDraft((current) => {
                        const label = event.target.value;
                        return {
                          ...current,
                          label,
                          key: current.key || slugifyTemplateKey(label),
                        };
                      })
                    }
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
                    onChange={(event) =>
                      setCreateDraft((current) => {
                        const nextChannel = event.target.value as MessageTemplateChannel;
                        return {
                          ...current,
                          channel: nextChannel,
                          body_html:
                            nextChannel === "email" || nextChannel === "all"
                              ? ensureRichDraftHtml(current)
                              : current.body_html,
                        };
                      })
                    }
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

                <div className="field field--full">
                  <span className="field__label">Message Body</span>
                  <div className="mtpl-token-actions">
                    <span className="mtpl-token-actions__label">Insert token:</span>
                    {tokenList.map((token) => (
                      <button
                        key={token.token}
                        className="mtpl-token-btn"
                        type="button"
                        title={token.purpose}
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => handleTokenButtonClick(event, () => insertCreateToken(token.token))}
                      >
                        {token.token}
                      </button>
                    ))}
                  </div>
                  {isCreateRte ? (
                    <RichTextEditor
                      value={ensureRichDraftHtml(createDraft)}
                      onChange={(html) => setCreateDraft((current) => ({ ...current, body_html: html, body: getPlainTextFromHtml(html) }))}
                      placeholder="Compose your template message..."
                      onEditorReady={(e) => { createEditorRef.current = e; }}
                    />
                  ) : (
                    <textarea
                      className="textarea-control"
                      rows={8}
                      ref={createBodyRef}
                      value={createDraft.body}
                      onChange={(event) =>
                        setCreateDraft((current) => ({ ...current, body: normalizeMessageBody(event.target.value) }))
                      }
                    />
                  )}
                </div>

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
                  disabled={creating || !createDraft.label.trim() || (isCreateRte ? getPlainTextFromHtml(createDraft.body_html).length === 0 : !createDraft.body.trim())}
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
                      savingKey === activeTemplate.key || !activeDraft.label.trim() || (isActiveRte ? getPlainTextFromHtml(activeDraft.body_html).length === 0 : !activeDraft.body.trim()) || !activeIsDirty
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
                    onChange={(event) => {
                      const nextChannel = event.target.value as MessageTemplateChannel;
                      setDraftsByKey((current) => {
                        const existing = current[activeTemplate.key];
                        if (!existing) return current;
                        return {
                          ...current,
                          [activeTemplate.key]: {
                            ...existing,
                            channel: nextChannel,
                            body_html:
                              nextChannel === "email" || nextChannel === "all"
                                ? ensureRichDraftHtml(existing)
                                : existing.body_html,
                          },
                        };
                      });
                    }}
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

                <div className="field field--full">
                  <span className="field__label">Message Body</span>
                  <div className="mtpl-token-actions">
                    <span className="mtpl-token-actions__label">Insert token:</span>
                    {tokenList.map((token) => (
                      <button
                        key={token.token}
                        className="mtpl-token-btn"
                        type="button"
                        title={token.purpose}
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => handleTokenButtonClick(event, () => insertActiveToken(token.token))}
                      >
                        {token.token}
                      </button>
                    ))}
                  </div>
                  {isActiveRte ? (
                    <RichTextEditor
                      key={activeTemplate.key}
                      value={ensureRichDraftHtml(activeDraft)}
                      onChange={(html) => {
                        setDraftField(activeTemplate.key, "body_html", html);
                        setDraftField(activeTemplate.key, "body", getPlainTextFromHtml(html));
                      }}
                      placeholder="Compose your template message..."
                      onEditorReady={(e) => { activeEditorRef.current = e; }}
                    />
                  ) : (
                    <textarea
                      className="textarea-control"
                      rows={10}
                      ref={activeBodyRef}
                      value={activeDraft.body}
                      onChange={(event) => setDraftField(activeTemplate.key, "body", normalizeMessageBody(event.target.value))}
                    />
                  )}
                </div>
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
                  {isActiveRte ? (
                    <div
                      className="mtpl-preview__content mtpl-preview__content--html"
                      dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
                    />
                  ) : (
                    <p className="mtpl-preview__content mtpl-preview__content--multiline">{previewBody}</p>
                  )}
                </div>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
