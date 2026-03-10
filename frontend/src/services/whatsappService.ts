// File: frontend/src/services/whatsappService.ts
// Purpose: Provides a typed API wrapper for WhatsApp messaging.
// It keeps request/response handling consistent across the UI.

import { ApiError, api } from "@/dashboard/utils/api";

export type WhatsAppSendResponse = {
  provider: "meta";
  to: string;
  message_id: string | null;
};

export type WhatsAppSendResult =
  | { success: true; data: WhatsAppSendResponse }
  | { success: false; error: { message: string; code?: string } };

// Handles 'sendWhatsApp' workflow for this module.
export async function sendWhatsApp(to: string, message: string): Promise<WhatsAppSendResult> {
  try {
    const data = await api<WhatsAppSendResponse>("/api/whatsapp/send", {
      method: "POST",
      body: JSON.stringify({ to, message }),
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: { message: error.message, code: error.code } };
    }

    return {
      success: false,
      error: { message: "Failed to send WhatsApp message." },
    };
  }
}
