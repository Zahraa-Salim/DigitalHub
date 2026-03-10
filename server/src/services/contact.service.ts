// File: server/src/services/contact.service.ts
// Purpose: Implements the business rules for contact.
// It coordinates validation, data access, and side effects before results go back to controllers.


import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause } from "../utils/sql.js";
import { sendDigitalHubEmail } from "../utils/mailer.js";
import { countContactMessages, createContactMessage, listContactMessages, markContactReplied, updateContactStatus, } from "../repositories/contact.repo.js";
import { getContactMessageById } from "../repositories/contact.repo.js";

type ContactPayload = {
    name: string;
    email: string;
    phone?: string | null;
    subject?: string | null;
    message: string;
    kind?: string;
    company_name?: string | null;
    company_role?: string | null;
    linkedin_url?: string | null;
    visit_preferred_dates?: string | null;
    visit_notes?: string | null;
};

type ContactQuery = Record<string, unknown>;
// Handles 'createContactMessageService' workflow for this module.
export async function createContactMessageService(payload: ContactPayload) {
    const body = payload;
    const result = await createContactMessage({
        name: body.name,
        email: body.email.toLowerCase(),
        phone: body.phone ?? null,
        subject: body.subject ?? null,
        message: body.message,
        kind: body.kind ?? "question",
        company_name: body.company_name ?? null,
        company_role: body.company_role ?? null,
        linkedin_url: body.linkedin_url ?? null,
        visit_preferred_dates: body.visit_preferred_dates ?? null,
        visit_notes: body.visit_notes ?? null,
    });
    return result.rows[0];
}
// Handles 'listContactMessagesService' workflow for this module.
export async function listContactMessagesService(query: ContactQuery) {
    const list = parseListQuery(query, ["id", "created_at", "status", "last_replied_at"], "created_at");
    const params: string[] = [];
    const where: string[] = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["name", "email", "COALESCE(subject, '')", "message", "COALESCE(company_name, '')"], params.length));
    }
    if (list.status) {
        params.push(list.status);
        where.push(`status = $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countContactMessages(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listContactMessages(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
// Handles 'updateContactMessageStatusService' workflow for this module.
export async function updateContactMessageStatusService(id: number, status: string) {
    const resolvedAt = status === "resolved" ? "NOW()" : "NULL";
    const result = await updateContactStatus(id, status, resolvedAt);
    if (!result.rowCount) {
        throw new AppError(404, "CONTACT_MESSAGE_NOT_FOUND", "Contact message not found.");
    }
    return result.rows[0];
}
// Handles 'replyToContactMessageService' workflow for this module.
export async function replyToContactMessageService(id: number, adminId: number, replyMessage: string, replySubject?: string | null, templateKey?: string | null) {
    const messageResult = await getContactMessageById(id);
    if (!messageResult.rowCount) {
        throw new AppError(404, "CONTACT_MESSAGE_NOT_FOUND", "Contact message not found.");
    }
    const contactMessage = messageResult.rows[0];
    const recipientEmail = String(contactMessage.email ?? "").trim();
    if (!recipientEmail) {
        throw new AppError(400, "VALIDATION_ERROR", "Contact email is required to send a reply.");
    }
    const normalizedSubject = String(replySubject ?? "").trim();
    const fallbackSubject = contactMessage.subject
        ? `Re: ${String(contactMessage.subject).trim()}`
        : "Reply from Digital Hub";
    const subjectToSend = normalizedSubject || fallbackSubject;
    try {
        await sendDigitalHubEmail({
            to: recipientEmail,
            subject: subjectToSend,
            body: replyMessage,
        });
    }
    catch (error: unknown) {
        throw new AppError(502, "EMAIL_SEND_FAILED", "Failed to send reply email.", error instanceof Error ? error.message : String(error));
    }
    const result = await markContactReplied(id);
    await logAdminAction({
        actorUserId: adminId,
        action: "reply to contact message",
        entityType: "contact_messages",
        entityId: id,
        message: `A reply email was sent for contact message ${id}.`,
        metadata: {
            reply_message: replyMessage,
            reply_subject: subjectToSend,
            template_key: templateKey ?? null,
            recipient_email: recipientEmail,
        },
        title: "Contact Reply Sent",
        body: `Contact message #${id} was replied to by email.`,
    });
    return {
        ...result.rows[0],
        reply_message: replyMessage,
        reply_subject: subjectToSend,
        recipient_email: recipientEmail,
        template_key: templateKey ?? null,
    };
}

