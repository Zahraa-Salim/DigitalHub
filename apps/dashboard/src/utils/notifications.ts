export const NOTIFICATIONS_UPDATED_EVENT = "dh-notifications-updated";

export function emitNotificationsUpdated() {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}
