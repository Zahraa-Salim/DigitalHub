// File: frontend/src/dashboard/utils/notifications.ts
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
export const NOTIFICATIONS_UPDATED_EVENT = "dh-notifications-updated";
export const NOTIFICATIONS_COUNT_UPDATED_EVENT = "dh-notifications-count-updated";

let cachedUnreadCount = 0;

export function getCachedNotificationsUnreadCount() {
  return cachedUnreadCount;
}

export function setCachedNotificationsUnreadCount(value: number) {
  const normalized = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  cachedUnreadCount = normalized;
  window.dispatchEvent(
    new CustomEvent<{ unreadCount: number }>(NOTIFICATIONS_COUNT_UPDATED_EVENT, {
      detail: { unreadCount: normalized },
    }),
  );
}

export function getUnreadCountFromEvent(event: Event): number | null {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const unreadCount = event.detail?.unreadCount;
  if (typeof unreadCount !== "number" || !Number.isFinite(unreadCount)) {
    return null;
  }

  return Math.max(0, Math.trunc(unreadCount));
}

export function emitNotificationsUpdated() {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}
