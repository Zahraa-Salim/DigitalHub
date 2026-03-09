// File: server/src/controllers/contact.controller.ts
// What this code does:
// 1) Reads validated request input from params, query, and body.
// 2) Calls service-layer functions to execute business operations.
// 3) Maps operation results into consistent API responses.
// 4) Keeps HTTP transport concerns separate from business logic.
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


