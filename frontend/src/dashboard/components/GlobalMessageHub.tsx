// File: frontend/src/dashboard/components/GlobalMessageHub.tsx
// Purpose: Renders the dashboard global message hub component.
// It packages reusable admin UI and behavior for dashboard pages.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createApplicationMessage,
  createProgramApplicationMessage,
  listMessageTemplates,
  listMessagingUsers,
  sendApplicationMessage,
  sendMessagingUsers,
  sendProgramApplicationMessage,
  type MessageAttachment,
  type MessageTemplate,
  type MessagingUser,
} from "../lib/api";
import {
  applyTemplateTokens,
  FALLBACK_MESSAGE_TEMPLATES,
  filterTemplatesForChannel,
} from "../lib/messageTemplates";
import { PulseDots } from "./PulseDots";
import { ToastStack } from "./ToastStack";
import { useGlobalMessagingContext } from "./GlobalMessagingContext";
import { useDashboardToasts } from "../hooks/useDashboardToasts";
import { ApiError, api } from "../utils/api";
import { RichTextEditor } from "./RichTextEditor";
import { getPlainTextFromHtml } from "./RichTextEditor.utils";

type RecipientGroup = "individual" | "selected" | "all" | `status:${string}`;

type ComposerRecipient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status?: string;
  meta?: string;
};

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4.5 3v-3H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function toDisplayName(user: MessagingUser): string {
  if (typeof user.full_name === "string" && user.full_name.trim()) return user.full_name.trim();
  if (typeof user.email === "string" && user.email.trim()) return user.email.trim();
  if (typeof user.phone === "string" && user.phone.trim()) return user.phone.trim();
  return `User #${user.id}`;
}

function toStatusLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSearchableText(recipient: ComposerRecipient): string {
  return `${recipient.name} ${recipient.email} ${recipient.phone}`.toLowerCase();
}

export function GlobalMessageHub() {
  const { pageData } = useGlobalMessagingContext();

  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<MessagingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");

  const [group, setGroup] = useState<RecipientGroup>("individual");
  const [singleId, setSingleId] = useState<string | null>(null);
  const [manualSelectedIds, setManualSelectedIds] = useState<Set<string>>(new Set());

  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialGroupSetRef = useRef(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>(FALLBACK_MESSAGE_TEMPLATES);
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();

  const hasApplicantContext = Boolean(pageData?.recipients.length);
  const pageRecipients = useMemo<ComposerRecipient[]>(
    () =>
      (pageData?.recipients ?? []).map((entry) => ({
        id: entry.id,
        name: entry.name,
        email: entry.email?.trim() || "",
        phone: entry.phone?.trim() || "",
        status: entry.status,
        meta: entry.meta,
      })),
    [pageData],
  );

  const userRecipients = useMemo<ComposerRecipient[]>(
    () =>
      users.map((user) => ({
        id: String(user.id),
        name: toDisplayName(user),
        email: user.email?.trim() || "",
        phone: user.phone?.trim() || "",
      })),
    [users],
  );

  const sourceRecipients = hasApplicantContext ? pageRecipients : userRecipients;
  const selectedIdSet = useMemo(
    () => (hasApplicantContext ? new Set(pageData?.selectedRecipientIds ?? []) : manualSelectedIds),
    [hasApplicantContext, pageData?.selectedRecipientIds, manualSelectedIds],
  );
  const selectedCount = selectedIdSet.size;
  const pageScope = pageData?.scope;

  const statusOptions = useMemo(() => {
    if (!hasApplicantContext) return [] as string[];
    if (pageData?.statusOptions?.length) return pageData.statusOptions;
    return [...new Set(pageRecipients.map((entry) => entry.status).filter((status): status is string => Boolean(status)))];
  }, [hasApplicantContext, pageData?.statusOptions, pageRecipients]);

  const searchedRecipients = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return sourceRecipients;
    return sourceRecipients.filter((recipient) => toSearchableText(recipient).includes(normalized));
  }, [search, sourceRecipients]);
  const visibleTemplates = useMemo(
    () => filterTemplatesForChannel(templates, channel),
    [templates, channel],
  );

  useEffect(() => {
    let active = true;
    const loadTemplates = async () => {
      try {
        const result = await listMessageTemplates({ limit: 100, sortBy: "sort_order", order: "asc" });
        if (!active) return;
        const data = result.data;
        setTemplates(data.length ? data : FALLBACK_MESSAGE_TEMPLATES);
      } catch {
        if (!active) return;
        setTemplates(FALLBACK_MESSAGE_TEMPLATES);
      }
    };
    void loadTemplates();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open || hasApplicantContext) return;

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const result = await listMessagingUsers({
          page: 1,
          limit: 200,
          sortBy: "full_name",
          order: "asc",
          search: search.trim() || undefined,
        });
        if (!active) return;
        setUsers(result.data);
      } catch (error) {
        if (!active) return;
        setUsers([]);
        if (error instanceof ApiError && error.status === 404) {
          pushToast("error", "Messaging users endpoint is not loaded. Restart the backend server and try again.");
        } else {
          pushToast("error", error instanceof ApiError ? error.message : "Failed to load users.");
        }
      } finally {
        if (active) setLoadingUsers(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, hasApplicantContext, pushToast, search]);

  useEffect(() => {
    if (!open) return;

    if (group.startsWith("status:")) {
      const status = group.replace("status:", "");
      if (!statusOptions.includes(status)) {
        setGroup(selectedCount > 0 ? "selected" : "all");
      }
    }
  }, [open, group, selectedCount, statusOptions]);

  useEffect(() => {
    if (!open) return;

    if (group !== "individual") return;

    const availableIds = new Set(sourceRecipients.map((entry) => entry.id));
    if (singleId && availableIds.has(singleId)) return;

    setSingleId(sourceRecipients[0]?.id ?? null);
  }, [open, group, singleId, sourceRecipients]);

  useEffect(() => {
    if (!open) {
      initialGroupSetRef.current = false;
      return;
    }
    if (initialGroupSetRef.current) return;
    initialGroupSetRef.current = true;
    if (selectedCount > 0) {
      setGroup("selected");
    }
  }, [open, selectedCount]);

  useEffect(() => {
    if (!open || hasApplicantContext) return;
    if (group === "selected" && manualSelectedIds.size === 0) {
      setGroup("individual");
    }
  }, [open, hasApplicantContext, group, manualSelectedIds]);

  const recipients = useMemo(() => {
    if (group === "selected") {
      return sourceRecipients.filter((entry) => selectedIdSet.has(entry.id));
    }
    if (group === "individual") {
      return sourceRecipients.filter((entry) => entry.id === singleId);
    }
    if (group.startsWith("status:")) {
      const status = group.replace("status:", "");
      return searchedRecipients.filter((entry) => entry.status === status);
    }
    return searchedRecipients;
  }, [group, searchedRecipients, selectedIdSet, singleId, sourceRecipients]);

  const hasBody = channel === "email" ? getPlainTextFromHtml(bodyHtml).length > 0 : body.trim().length > 0;
  const canSend = recipients.length > 0 && hasBody && (channel === "sms" || subject.trim().length > 0);

  const openComposer = () => {
    setOpen(true);
    setShowTemplates(false);
    setSearch("");
  };

  const closeComposer = () => {
    setOpen(false);
    setSearch("");
    setShowTemplates(false);
    setSending(false);
    setAttachments([]);
    setBodyHtml("");
    setGroup("individual");
    setSingleId(null);
    setUsers([]);
  };

  const toggleManualSelected = (recipientId: string) => {
    setManualSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(recipientId)) next.delete(recipientId);
      else next.add(recipientId);
      return next;
    });
  };

  const handleFileAttach = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    if (file.size > 10 * 1024 * 1024) {
      pushToast("error", "File must be 10MB or less.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] || "");
        };
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(file);
      });

      const uploaded = await api<{ public_url: string }>("/cms/media", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          data_base64: base64,
        }),
      });

      setAttachments((prev) => [
        ...prev,
        {
          url: uploaded.public_url,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size: file.size,
        },
      ]);
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to upload attachment.");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const applyTemplate = (template: MessageTemplate) => {
    const tokens: Record<string, string> = {};
    if (hasApplicantContext) {
      if (recipients.length === 1) {
        tokens.name = recipients[0].name.split(" ")[0];
      }
    } else {
      tokens.name = recipients.length === 1 ? recipients[0].name.split(" ")[0] : "there";
    }

    setSubject(applyTemplateTokens(template.subject || template.label, tokens));
    const renderedBody = applyTemplateTokens(template.body, tokens);
    setBody(renderedBody);
    if (channel === "email") {
      const htmlBody = template.body_html
        ? applyTemplateTokens(template.body_html, tokens)
        : `<p>${renderedBody.replace(/\n/g, "</p><p>")}</p>`;
      setBodyHtml(htmlBody);
    }
    setShowTemplates(false);
  };

  const sendMessage = async () => {
    if (!canSend || sending) return;

    const recipientsToSend = recipients
      .map((entry) => ({
        id: entry.id,
        to: channel === "email" ? entry.email.trim() : entry.phone.trim(),
      }))
      .filter((entry) => entry.to.length > 0);

    if (!recipientsToSend.length) {
      pushToast(
        "error",
        channel === "email"
          ? "Selected recipients do not have email addresses."
          : "Selected recipients do not have phone numbers.",
      );
      return;
    }

    setSending(true);
    try {
      if (!hasApplicantContext) {
        const numericUserIds = recipientsToSend
          .map((entry) => Number(entry.id))
          .filter((value) => Number.isInteger(value) && value > 0);
        if (!numericUserIds.length) {
          pushToast("error", "No valid users selected.");
          return;
        }

        const plainBody = channel === "email" ? getPlainTextFromHtml(bodyHtml) : body.trim();
        await sendMessagingUsers({
          channel,
          user_ids: numericUserIds,
          subject: channel === "email" ? subject.trim() : undefined,
          body: plainBody,
          body_html: channel === "email" ? bodyHtml : undefined,
          attachments: attachments.length ? attachments : undefined,
        });
        pushToast("success", `${channel === "email" ? "Email" : "WhatsApp"} message sent to ${numericUserIds.length} recipient${numericUserIds.length === 1 ? "" : "s"}.`);
        closeComposer();
        return;
      }

      const sendOne = async (recipient: { id: string; to: string }) => {
        const resourceId = Number(recipient.id);
        if (!Number.isInteger(resourceId) || resourceId <= 0) {
          throw new Error(`Invalid recipient id '${recipient.id}'.`);
        }

        const msgPlainBody = channel === "email" ? getPlainTextFromHtml(bodyHtml) : body.trim();
        const msgPayload = {
          channel,
          to_value: recipient.to,
          subject: channel === "email" ? subject.trim() : undefined,
          body: msgPlainBody,
          body_html: channel === "email" ? bodyHtml : undefined,
          attachments: attachments.length ? attachments : undefined,
        };

        if (pageScope === "applications") {
          const created = await createApplicationMessage(resourceId, msgPayload);
          await sendApplicationMessage(resourceId, created.id);
          return;
        }

        if (pageScope === "program_applications") {
          const created = await createProgramApplicationMessage(resourceId, msgPayload);
          await sendProgramApplicationMessage(resourceId, created.id);
          return;
        }

        throw new Error("Messaging scope is not configured for this page.");
      };

      const results = await Promise.allSettled(recipientsToSend.map((entry) => sendOne(entry)));
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length) {
        const firstError = failed[0];
        const reason =
          firstError.status === "rejected"
            ? firstError.reason instanceof ApiError
              ? firstError.reason.message
              : String(firstError.reason ?? "Unknown error")
            : "Unknown error";
        const message = `${failed.length} of ${recipientsToSend.length} messages failed. ${reason}`;
        pushToast("error", message);
        return;
      }

      pushToast("success", `${channel === "email" ? "Email" : "WhatsApp"} message sent to ${recipientsToSend.length} recipient${recipientsToSend.length === 1 ? "" : "s"}.`);
      closeComposer();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to send message.";
      pushToast("error", message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button className="admx-fab global-msg-hub__fab" type="button" aria-label="Open message composer" onClick={openComposer}>
        <MessageIcon />
      </button>

      {open ? (
        <div className="admx-modal" role="presentation">
          <div className="admx-modal__backdrop" onClick={closeComposer} />
          <div className="admx-modal__card" role="dialog" aria-modal="true">
            <header className="admx-modal__header">
              <div>
                <h3>Compose Message</h3>
                <p>{recipients.length} recipient{recipients.length === 1 ? "" : "s"}</p>
              </div>
              <div className="admx-switch">
                <button className={channel === "email" ? "admx-switch__btn admx-switch__btn--active" : "admx-switch__btn"} type="button" onClick={() => setChannel("email")}>Email</button>
                <button className={channel === "sms" ? "admx-switch__btn admx-switch__btn--active" : "admx-switch__btn"} type="button" onClick={() => setChannel("sms")}>WhatsApp</button>
              </div>
            </header>

            <div className="admx-modal__body">
              <label className="admx-label">Send To</label>
              <div className="admx-chip-row">
                {(!hasApplicantContext || sourceRecipients.length <= 20) ? (
                  <button className={group === "individual" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setGroup("individual")}>Individual</button>
                ) : null}
                <button className={group === "selected" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setGroup("selected")}>Selected ({selectedCount})</button>
                <button className={group === "all" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setGroup("all")}>All ({sourceRecipients.length})</button>
                {statusOptions.map((status) => {
                  const chipValue = `status:${status}` as const;
                  return (
                    <button key={chipValue} className={group === chipValue ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setGroup(chipValue)}>
                      {toStatusLabel(status)}
                    </button>
                  );
                })}
              </div>

              <input
                className="field__control"
                type="text"
                placeholder={hasApplicantContext ? "Search applicants by name, email, phone..." : "Search users by name, email, phone..."}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {!hasApplicantContext ? (
                <p className="admx-search-hint">
                  Searching students, instructors, and managers by name, email, or phone.
                </p>
              ) : null}

              {group === "individual" ? (
                <>
                  <select className="field__control" value={singleId ?? ""} onChange={(event) => setSingleId(event.target.value || null)}>
                    <option value="">{hasApplicantContext ? "Select applicant..." : "Select user..."}</option>
                    {searchedRecipients.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}{entry.meta ? ` | ${entry.meta}` : entry.email ? ` | ${entry.email}` : ""}
                      </option>
                    ))}
                  </select>
                  {!hasApplicantContext ? (
                    <button
                      className="admx-chip admx-chip--muted"
                      type="button"
                      style={{ marginTop: 4 }}
                      onClick={() => setGroup("selected")}
                    >
                      + Select multiple recipients
                    </button>
                  ) : null}
                </>
              ) : null}

              {group === "selected" && !hasApplicantContext ? (
                <div className="admx-recipient-list">
                  {loadingUsers ? <PulseDots layout="inline" label="Loading" /> : null}
                  {!loadingUsers && searchedRecipients.length === 0 ? <span className="admx-recipient-pill">No users found</span> : null}
                  {searchedRecipients.map((entry) => (
                    <button key={entry.id} className={manualSelectedIds.has(entry.id) ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => toggleManualSelected(entry.id)}>
                      {entry.name}
                    </button>
                  ))}
                </div>
              ) : null}

              {channel === "email" ? (
                <input className="field__control" type="text" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
              ) : null}

              <div className="admx-inline-head">
                <span className="admx-label">Message</span>
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => setShowTemplates((current) => !current)}>Templates</button>
              </div>

              {showTemplates ? (
                <div className="admx-template-grid">
                  {visibleTemplates.map((template) => (
                    <button key={template.key} className="admx-template" type="button" onClick={() => applyTemplate(template)}>
                      {template.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {channel === "email" ? (
                <RichTextEditor
                  value={bodyHtml}
                  onChange={setBodyHtml}
                  placeholder="Compose your email message..."
                />
              ) : (
                <textarea className="textarea-control" rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Compose your WhatsApp message..." />
              )}

              <div className="rte-attachments">
                <input ref={fileInputRef} type="file" hidden onChange={handleFileAttach} />
                <button className="rte-attach-btn" type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  {uploading ? "Uploading..." : "+ Attach File"}
                </button>
                {attachments.map((att, i) => (
                  <span key={i} className="rte-attachment">
                    {att.filename}
                    <button type="button" onClick={() => removeAttachment(i)} title="Remove">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            <footer className="admx-modal__footer">
              <button className="btn btn--secondary" type="button" onClick={closeComposer}>Cancel</button>
              <button className="btn btn--primary" type="button" disabled={!canSend || sending} onClick={() => void sendMessage()}>
                {sending ? "Sending..." : `Send to ${recipients.length || "-"}`}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
      <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
    </>
  );
}

