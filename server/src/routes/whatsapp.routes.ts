// File: server/src/routes/whatsapp.routes.ts
// Purpose: Registers the Express routes for WhatsApp messaging.
// It validates requests and forwards them to the WhatsApp utility.

import { Router } from "express";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { whatsappSendBodySchema } from "../schemas/whatsapp.schemas.js";
import { sendDigitalHubWhatsApp } from "../utils/whatsapp.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendError, sendSuccess } from "../utils/httpResponse.js";

const whatsappRouter = Router();

whatsappRouter.use(verifyAdminAuth);

whatsappRouter.post(
  "/send",
  validateRequest({ body: whatsappSendBodySchema }),
  asyncHandler(async (req, res) => {
    const { to, message } = req.body || {};
    try {
      const result = await sendDigitalHubWhatsApp({ to, body: message });
      sendSuccess(res, result, "WhatsApp message sent.");
    } catch (err: any) {
      sendError(res, err.statusCode ?? 502, err.code ?? "WHATSAPP_SEND_FAILED", err.message, err.details);
    }
  }),
);

export { whatsappRouter };
