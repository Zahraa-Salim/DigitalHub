// File: server/src/services/whatsappService.ts
// Purpose: Sends WhatsApp messages through the Meta Cloud API.
// It encapsulates provider configuration and request handling.

import axios from "axios";

const META_GRAPH_BASE_URL = "https://graph.facebook.com/v19.0";

type WhatsAppSendSuccess = {
  provider: "meta";
  to: string;
  message_id: string | null;
};

type WhatsAppSendFailure = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

export type WhatsAppSendResult =
  | { success: true; data: WhatsAppSendSuccess }
  | { success: false; error: WhatsAppSendFailure };

// Handles 'readMetaConfig' workflow for this module.
function readMetaConfig() {
  const token = String(process.env.META_WA_TOKEN || "").trim();
  const phoneNumberId = String(process.env.META_PHONE_NUMBER_ID || "").trim();
  return { token, phoneNumberId };
}

// Handles 'sendWhatsAppMessage' workflow for this module.
export async function sendWhatsAppMessage(to: string, message: string): Promise<WhatsAppSendResult> {
  const { token, phoneNumberId } = readMetaConfig();
  const destination = String(to || "").trim();
  const body = String(message || "").trim();

  if (!token || !phoneNumberId) {
    return {
      success: false,
      error: {
        status: 500,
        code: "WHATSAPP_NOT_CONFIGURED",
        message: "Meta WhatsApp credentials are not configured.",
      },
    };
  }

  if (!destination || !body) {
    return {
      success: false,
      error: {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Destination and message body are required.",
      },
    };
  }

  const url = `${META_GRAPH_BASE_URL}/${encodeURIComponent(phoneNumberId)}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: destination,
    type: "text",
    text: {
      body,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const messageId = response?.data?.messages?.[0]?.id ?? null;

    return {
      success: true,
      data: {
        provider: "meta",
        to: destination,
        message_id: messageId,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: {
          status: error.response?.status ?? 502,
          code: "WHATSAPP_SEND_FAILED",
          message: error.response?.data?.error?.message || "Failed to send WhatsApp message.",
          details: error.response?.data ?? error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        status: 500,
        code: "WHATSAPP_SEND_FAILED",
        message: "Failed to send WhatsApp message.",
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
