// File: server/src/utils/whatsapp.ts
// Purpose: Provides shared helper logic for whatsapp.
// It supports other backend modules with reusable utility functions.


import { AppError } from "./appError.js";

let warnedMockMode = false;

type WhatsAppConfig = {
  provider: string;
  accountSid: string;
  authToken: string;
  from: string;
  metaToken: string;
  metaPhoneNumberId: string;
};

type SendWhatsAppInput = {
  to: string;
  body: string;
  mediaUrl?: string;
};

// Handles 'normalizePhone' workflow for this module.
function normalizePhone(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Keep leading plus if present, remove other non-digits.
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return `${hasPlus ? "+" : ""}${digits}`;
}

// Handles 'normalizeToE164' workflow for this module.
function normalizeToE164(phone: string): string {
  const raw = String(phone || "").trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (raw.startsWith("00")) return `+${digits.slice(2)}`;
  if (raw.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

// Handles 'readConfig' workflow for this module.
function readConfig(): WhatsAppConfig {
  const provider = (process.env.WHATSAPP_PROVIDER || "meta").trim().toLowerCase();
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim() || "";
  const metaToken = process.env.META_WA_TOKEN?.trim() || "";
  const metaPhoneNumberId = process.env.META_PHONE_NUMBER_ID?.trim() || "";

  const from = fromRaw
    ? fromRaw.startsWith("whatsapp:")
      ? fromRaw
      : `whatsapp:${fromRaw}`
    : "";

  return {
    provider,
    accountSid,
    authToken,
    from,
    metaToken,
    metaPhoneNumberId,
  };
}

// Handles 'isConfigured' workflow for this module.
function isConfigured(config: WhatsAppConfig): boolean {
  if (config.provider === "twilio") {
    return Boolean(config.accountSid && config.authToken && config.from);
  }
  if (config.provider === "meta") {
    return Boolean(config.metaToken && config.metaPhoneNumberId);
  }
  return false;
}

// Handles 'sendDigitalHubWhatsApp' workflow for this module.
export async function sendDigitalHubWhatsApp({ to, body, mediaUrl }: SendWhatsAppInput) {
  const destinationPhone = normalizePhone(to);
  const normalizedPhone = normalizeToE164(destinationPhone);
  const messageBody = String(body || "").trim();

  if (!normalizedPhone) {
    throw new AppError(400, "VALIDATION_ERROR", "WhatsApp destination phone is required.", undefined);
  }
  if (!messageBody) {
    throw new AppError(400, "VALIDATION_ERROR", "WhatsApp message body is required.", undefined);
  }

  const config = readConfig();
  const metaDestination = normalizedPhone.replace(/\D/g, "");
  const destination = config.provider === "meta" ? metaDestination : `whatsapp:${normalizedPhone}`;

  if (!isConfigured(config)) {
    if (!warnedMockMode) {
      warnedMockMode = true;
      console.error("[whatsapp] Provider is not fully configured. Check META_WA_TOKEN and META_PHONE_NUMBER_ID in your .env file.");
    }
    throw new AppError(
      503,
      "WHATSAPP_NOT_CONFIGURED",
      "WhatsApp is not configured. Set WHATSAPP_PROVIDER, META_WA_TOKEN, and META_PHONE_NUMBER_ID in your environment.",
      undefined,
    );
  }

  if (config.provider === "meta") {
    if (!metaDestination) {
      throw new AppError(400, "VALIDATION_ERROR", "WhatsApp destination phone is required.", undefined);
    }

    const metaApiVersion = (process.env.META_WA_API_VERSION || "v19.0").trim();
    const url = `https://graph.facebook.com/${metaApiVersion}/${encodeURIComponent(config.metaPhoneNumberId)}/messages`;

    const trimmedMediaUrl = (mediaUrl || "").trim();
    const isImage = trimmedMediaUrl && /\.(jpe?g|png|gif|webp)$/i.test(trimmedMediaUrl);
    const payload = trimmedMediaUrl
      ? isImage
        ? { messaging_product: "whatsapp", to: metaDestination, type: "image" as const, image: { link: trimmedMediaUrl, caption: messageBody } }
        : { messaging_product: "whatsapp", to: metaDestination, type: "document" as const, document: { link: trimmedMediaUrl, caption: messageBody, filename: trimmedMediaUrl.split("/").pop() || "file" } }
      : { messaging_product: "whatsapp", to: metaDestination, type: "text" as const, text: { body: messageBody } };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.metaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let details = "";
      try {
        details = await response.text();
      } catch {
        details = "";
      }
      throw new AppError(
        502,
        "WHATSAPP_SEND_FAILED",
        `WhatsApp provider failed with status ${response.status}.${details ? ` ${details}` : ""}`,
        undefined,
      );
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    const testNumbers = String(process.env.META_WA_TEST_NUMBERS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (testNumbers.length && !testNumbers.includes(metaDestination)) {
      console.warn(
        `[whatsapp] WARNING: META_WA_TEST_NUMBERS is set but ${metaDestination} is not in the list. Message may not be delivered in test mode.`,
      );
    }

    return {
      mode: "meta",
      provider: "meta",
      from: null,
      to: normalizedPhone,
      message_id: data?.messages?.[0]?.id ?? null,
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`;
  const authHeader = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;
  const payload = new URLSearchParams();
  payload.set("From", config.from);
  payload.set("To", destination);
  payload.set("Body", messageBody);
  const twilioMediaUrl = (mediaUrl || "").trim();
  if (twilioMediaUrl) {
    payload.set("MediaUrl", twilioMediaUrl);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch {
      details = "";
    }
    throw new AppError(
      502,
      "WHATSAPP_SEND_FAILED",
      `WhatsApp provider failed with status ${response.status}.${details ? ` ${details}` : ""}`,
      undefined,
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    mode: "twilio",
    provider: "twilio",
    from: config.from,
    to: normalizedPhone,
    sid: data?.sid ?? null,
    status: data?.status ?? null,
  };
}
