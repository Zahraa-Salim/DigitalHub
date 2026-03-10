// File: server/src/schemas/whatsapp.schemas.ts
// Purpose: Defines request validation for WhatsApp messaging endpoints.
// It ensures payloads match expected fields and formats.

import { z } from "zod";

export const whatsappSendBodySchema = z.object({
  to: z
    .string()
    .trim()
    .min(1, "Destination phone is required.")
    .regex(/^\d+$/, "Phone number must contain digits only."),
  message: z
    .string()
    .trim()
    .min(1, "Message is required."),
});
