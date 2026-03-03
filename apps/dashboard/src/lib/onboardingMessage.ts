type OnboardingSendEntry = {
  channel?: unknown;
  to?: unknown;
  error?: unknown;
};

export type OnboardingSummary = {
  sentCount: number;
  failedCount: number;
  skipped: boolean;
  reason: string;
  firstFailure: string;
};

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toSendEntries(value: unknown): OnboardingSendEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => toObject(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      channel: item.channel,
      to: item.to,
      error: item.error,
    }));
}

export function summarizeOnboardingMessage(payload: unknown): OnboardingSummary {
  const root = toObject(payload);
  const onboarding = toObject(root?.onboarding_message);
  const sentEntries = toSendEntries(onboarding?.sentMessages);
  const failedEntries = toSendEntries(onboarding?.failedMessages);
  const skipped = Boolean(onboarding?.skipped);
  const reason =
    typeof onboarding?.reason === "string"
      ? onboarding.reason
      : typeof onboarding?.skip_reason === "string"
        ? onboarding.skip_reason
        : "";

  const firstFailed = failedEntries[0];
  const channel = typeof firstFailed?.channel === "string" ? firstFailed.channel.toUpperCase() : "MESSAGE";
  const firstFailureText =
    typeof firstFailed?.error === "string" && firstFailed.error.trim()
      ? firstFailed.error.trim()
      : failedEntries.length
        ? "Delivery failed."
        : "";

  return {
    sentCount: sentEntries.length,
    failedCount: failedEntries.length,
    skipped,
    reason,
    firstFailure: firstFailureText ? `${channel}: ${firstFailureText}` : "",
  };
}

export function onboardingSkipReasonText(reason: string): string {
  switch (reason) {
    case "channels_disabled":
      return "Delivery was skipped because all channels were turned off.";
    case "no_contact_channel":
      return "No email or phone was available for delivery.";
    case "no_supported_destination":
      return "No supported destination was available for delivery.";
    case "user_already_created":
      return "Account already existed.";
    default:
      return "Delivery was skipped.";
  }
}
