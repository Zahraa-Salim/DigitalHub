import { useEffect, useMemo, useRef, useState } from "react";
import {
  createApplicationMessage,
  createProgramApplicationMessage,
  listMessageTemplates,
  listMessagingUsers,
  sendApplicationMessage,
  sendMessagingUsers,
  sendProgramApplicationMessage,
  type MessageTemplate,
  type MessagingUser,
} from "../lib/api";
import {
  applyTemplateTokens,
  FALLBACK_MESSAGE_TEMPLATES,
  filterTemplatesForChannel,
} from "../lib/messageTemplates";
import { ToastStack, type ToastItem } from "./ToastStack";
import { useGlobalMessagingContext } from "./GlobalMessagingContext";
import { ApiError } from "../utils/api";

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
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");

  const [group, setGroup] = useState<RecipientGroup>("individual");
  const [singleId, setSingleId] = useState<string | null>(null);
  const [manualSelectedIds, setManualSelectedIds] = useState<Set<string>>(new Set());

  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>(FALLBACK_MESSAGE_TEMPLATES);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(1);
  const toastTimersRef = useRef<Record<number, number>>({});

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
        const data = await listMessageTemplates();
        if (!active) return;
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
      setUsersError("");
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
          setUsersError("Messaging users endpoint is not loaded. Restart the backend server and try again.");
        } else {
          setUsersError(error instanceof ApiError ? error.message : "Failed to load users.");
        }
      } finally {
        if (active) setLoadingUsers(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, hasApplicantContext, search]);

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
    if (!open) return;

    if (selectedCount > 0) {
      setGroup((current) => (current === "individual" ? "selected" : current));
    } else if (group === "selected") {
      setGroup("all");
    }
  }, [open, selectedCount, group]);

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

  const canSend = recipients.length > 0 && body.trim().length > 0 && (channel === "sms" || subject.trim().length > 0);

  const pushToast = (tone: ToastItem["tone"], message: string) => {
    const id = toastIdRef.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    const timeoutId = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      delete toastTimersRef.current[id];
    }, 4000);
    toastTimersRef.current[id] = timeoutId;
  };

  const dismissToast = (id: number) => {
    const timeoutId = toastTimersRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete toastTimersRef.current[id];
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    return () => {
      Object.values(toastTimersRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      toastTimersRef.current = {};
    };
  }, []);

  const openComposer = () => {
    setOpen(true);
    setSendError("");
    setUsersError("");
    setShowTemplates(false);
    setSearch("");
  };

  const closeComposer = () => {
    setOpen(false);
    setSearch("");
    setSendError("");
    setUsersError("");
    setShowTemplates(false);
    setSending(false);
  };

  const toggleManualSelected = (recipientId: string) => {
    setManualSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(recipientId)) next.delete(recipientId);
      else next.add(recipientId);
      return next;
    });
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
    setBody(applyTemplateTokens(template.body, tokens));
    setShowTemplates(false);
  };

  const sendMessage = async () => {
    setSendError("");
    if (!canSend || sending) return;

    const recipientsToSend = recipients
      .map((entry) => ({
        id: entry.id,
        to: channel === "email" ? entry.email.trim() : entry.phone.trim(),
      }))
      .filter((entry) => entry.to.length > 0);

    if (!recipientsToSend.length) {
      setSendError(channel === "email" ? "Selected recipients do not have email addresses." : "Selected recipients do not have phone numbers.");
      return;
    }

    setSending(true);
    try {
      if (!hasApplicantContext) {
        const numericUserIds = recipientsToSend
          .map((entry) => Number(entry.id))
          .filter((value) => Number.isInteger(value) && value > 0);
        if (!numericUserIds.length) {
          setSendError("No valid users selected.");
          return;
        }

        await sendMessagingUsers({
          channel,
          user_ids: numericUserIds,
          subject: channel === "email" ? subject.trim() : undefined,
          body: body.trim(),
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

        if (pageScope === "applications") {
          const created = await createApplicationMessage(resourceId, {
            channel,
            to_value: recipient.to,
            subject: channel === "email" ? subject.trim() : undefined,
            body: body.trim(),
          });
          await sendApplicationMessage(resourceId, created.id);
          return;
        }

        if (pageScope === "program_applications") {
          const created = await createProgramApplicationMessage(resourceId, {
            channel,
            to_value: recipient.to,
            subject: channel === "email" ? subject.trim() : undefined,
            body: body.trim(),
          });
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
        setSendError(message);
        pushToast("error", message);
        return;
      }

      pushToast("success", `${channel === "email" ? "Email" : "WhatsApp"} message sent to ${recipientsToSend.length} recipient${recipientsToSend.length === 1 ? "" : "s"}.`);
      closeComposer();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to send message.";
      setSendError(message);
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
              {usersError ? <p className="admx-inline-error">{usersError}</p> : null}
              {sendError ? <p className="admx-inline-error">{sendError}</p> : null}

              <label className="admx-label">Send To</label>
              <div className="admx-chip-row">
                <button className={group === "individual" ? "admx-chip admx-chip--active" : "admx-chip"} type="button" onClick={() => setGroup("individual")}>Individual</button>
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

              {group === "individual" ? (
                <select className="field__control" value={singleId ?? ""} onChange={(event) => setSingleId(event.target.value || null)}>
                  <option value="">{hasApplicantContext ? "Select applicant..." : "Select user..."}</option>
                  {searchedRecipients.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}{entry.meta ? ` | ${entry.meta}` : entry.email ? ` | ${entry.email}` : ""}
                    </option>
                  ))}
                </select>
              ) : null}

              {group === "selected" && !hasApplicantContext ? (
                <div className="admx-recipient-list">
                  {loadingUsers ? <span className="admx-recipient-pill">Loading...</span> : null}
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

              <textarea className="textarea-control" rows={channel === "sms" ? 4 : 8} value={body} onChange={(event) => setBody(event.target.value)} />
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
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
