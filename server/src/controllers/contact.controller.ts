// File: server/src/controllers/contact.controller.ts
// Purpose: Handles HTTP request and response flow for contact.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import { createContactMessageService, listContactMessagesService, replyToContactMessageService, updateContactMessageStatusService, } from "../services/contact.service.js";
// Handles 'createContactMessage' workflow for this module.
export async function createContactMessage(req: Request, res: Response) {
    const data = await createContactMessageService(req.body);
    sendSuccess(res, data, "Contact message submitted successfully.", 201);
}
// Handles 'getContactMessages' workflow for this module.
export async function getContactMessages(req: Request, res: Response) {
    const result = await listContactMessagesService(req.query);
    sendList(res, result.data, result.pagination);
}
// Handles 'patchContactMessageStatus' workflow for this module.
export async function patchContactMessageStatus(req: Request, res: Response) {
    const data = await updateContactMessageStatusService(Number(req.params.id), req.body.status);
    sendSuccess(res, data, "Contact message status updated.");
}
// Handles 'replyToContactMessage' workflow for this module.
export async function replyToContactMessage(req: Request, res: Response) {
    const data = await replyToContactMessageService(Number(req.params.id), req.user!.id, req.body.reply_message, req.body.reply_subject, req.body.template_key);
    sendSuccess(res, data, "Reply sent successfully.");
}





