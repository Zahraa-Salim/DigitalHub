import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthUser } from "../utils/auth";
import { apiList } from "../utils/api";
import { NOTIFICATIONS_UPDATED_EVENT } from "../utils/notifications";

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
  const [unreadCount, setUnreadCount] = useState(0);
  const displayName = user.full_name || "Admin";

  useEffect(() => {
    let active = true;

    const loadUnreadCount = async () => {
      try {
        const result = await apiList<unknown>(
          "/notifications?is_read=false&page=1&limit=1&sortBy=created_at&order=desc",
        );
        if (active) {
          setUnreadCount(result.pagination.total);
        }
      } catch {
        if (active) {
          setUnreadCount(0);
        }
      }
    };

    void loadUnreadCount();
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

    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 10000);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
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
    </header>
  );
}
