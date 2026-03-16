// File: frontend/src/dashboard/components/Topbar.tsx
// Purpose: Renders the dashboard topbar component.
// It packages reusable admin UI and behavior for dashboard pages.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WhatsAppMessageModal } from "@/components/WhatsAppMessageModal";
import type { AuthUser } from "../utils/auth";
import { ApiError, apiList } from "../utils/api";
import {
  getCachedNotificationsUnreadCount,
  getUnreadCountFromEvent,
  NOTIFICATIONS_COUNT_UPDATED_EVENT,
  NOTIFICATIONS_UPDATED_EVENT,
  setCachedNotificationsUnreadCount,
} from "../utils/notifications";

type TopbarProps = {
  title: string;
  user: AuthUser;
  onToggleMenu: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onLogout: () => void;
};

export function Topbar({
  title,
  user,
  onToggleMenu,
  onToggleSidebar,
  sidebarCollapsed,
  onLogout,
}: TopbarProps) {
  const navigate = useNavigate();
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getCachedNotificationsUnreadCount());
  const displayName = user.full_name || "Admin";

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let nextAttemptAt = 0;

    const syncFromCache = () => {
      if (active) {
        setUnreadCount(getCachedNotificationsUnreadCount());
      }
    };

    const loadUnreadCount = async () => {
      if (inFlight) {
        return;
      }
      if (Date.now() < nextAttemptAt) {
        return;
      }

      inFlight = true;
      try {
        const result = await apiList<unknown>(
          "/notifications?is_read=false&page=1&limit=1&sortBy=created_at&order=desc",
        );
        if (active) {
          nextAttemptAt = 0;
          setCachedNotificationsUnreadCount(result.pagination.total);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 503) {
          nextAttemptAt = Date.now() + 60000;
        } else {
          nextAttemptAt = Date.now() + 15000;
        }
      } finally {
        inFlight = false;
        syncFromCache();
      }
    };

    syncFromCache();
    void loadUnreadCount();

    const onUnreadCountUpdated = (event: Event) => {
      const value = getUnreadCountFromEvent(event);
      if (!active || value === null) {
        return;
      }
      setUnreadCount(value);
    };

    const onNotificationsUpdated = () => {
      void loadUnreadCount();
    };
    const onWindowFocus = () => {
      void loadUnreadCount();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadUnreadCount();
      }
    };

    window.addEventListener(NOTIFICATIONS_COUNT_UPDATED_EVENT, onUnreadCountUpdated as EventListener);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener(NOTIFICATIONS_COUNT_UPDATED_EVENT, onUnreadCountUpdated as EventListener);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <header className="topbar card">
      <div className="topbar__left">
        <button
          className="mobile-menu-btn topbar__menu"
          type="button"
          onClick={onToggleMenu}
          aria-label="Open navigation menu"
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <button
          className="icon-btn topbar__collapse"
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span aria-hidden>{sidebarCollapsed ? ">>" : "<<"}</span>
        </button>
        <div>
          <h1 className="topbar__title">{title}</h1>
          <p className="topbar__subtitle">Admin workspace</p>
        </div>
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          className="icon-btn topbar-whatsapp-btn"
          title="Send WhatsApp message"
          aria-label="Send WhatsApp message"
          onClick={() => setWhatsappOpen(true)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </button>
        <button className="icon-btn" type="button" aria-label="Notifications" onClick={() => navigate("/admin/notifications")}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M6 9a6 6 0 0 1 12 0v5l2 2H4l2-2z" />
            <path d="M10 18a2 2 0 0 0 4 0" />
          </svg>
          {unreadCount > 0 ? <span className="icon-btn__badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
        </button>

        <div className="topbar__user">
          <button
            className="topbar__profile-link"
            type="button"
            onClick={() => navigate("/admin/profile")}
            aria-label="Open my profile"
          >
            <span className="topbar__avatar" aria-hidden>
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div className="topbar__user-info">
              <p className="topbar__user-name">{displayName}</p>
              <p className="topbar__user-role">{user.role_label}</p>
            </div>
          </button>
          <button className="btn btn--ghost topbar__logout" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
      <WhatsAppMessageModal
        isOpen={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
      />
    </header>
  );
}

