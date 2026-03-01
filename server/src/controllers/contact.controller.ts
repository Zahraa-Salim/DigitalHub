// File Summary: server/src/controllers/contact.controller.ts
// Layer: controllers
// Purpose: Maps validated HTTP input to service calls and sends standardized responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createContactMessageService, listContactMessagesService, replyToContactMessageService, updateContactMessageStatusService, } from "../services/contact.service.js";
export async function createContactMessage(req, res) {
    const data = await createContactMessageService(req.body);
    sendSuccess(res, data, "Contact message submitted successfully.", 201);
}
export async function getContactMessages(req, res) {
    const result = await listContactMessagesService(req.query);
    sendList(res, result.data, result.pagination);
}
export async function patchContactMessageStatus(req, res) {
    const data = await updateContactMessageStatusService(Number(req.params.id), req.body.status);
    sendSuccess(res, data, "Contact message status updated.");
}
export async function replyToContactMessage(req, res) {
    const data = await replyToContactMessageService(Number(req.params.id), req.user.id, req.body.reply_message, req.body.reply_subject, req.body.template_key);
    sendSuccess(res, data, "Reply sent successfully.");
}


