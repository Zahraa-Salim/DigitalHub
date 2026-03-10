// File: server/src/routes/whatsapp.routes.ts
// Purpose: Registers the Express routes for WhatsApp messaging.
// It validates requests and forwards them to the WhatsApp service.

// @ts-nocheck

import { Router } from "express";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { whatsappSendBodySchema } from "../schemas/whatsapp.schemas.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendError, sendSuccess } from "../utils/httpResponse.js";

const whatsappRouter = Router();

whatsappRouter.use(verifyAdminAuth);

whatsappRouter.post(
  "/send",
  validateRequest({ body: whatsappSendBodySchema }),
  asyncHandler(async (req, res) => {
    const { to, message } = req.body || {};
    const result = await sendWhatsAppMessage(to, message);

    if (!result.success) {
      sendError(res, result.error.status, result.error.code, result.error.message, result.error.details);
      return;
    }

    sendSuccess(res, result.data, "WhatsApp message sent.");
  }),
);

export { whatsappRouter };
