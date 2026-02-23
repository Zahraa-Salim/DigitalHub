import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthUser } from "../utils/auth";
import { apiList } from "../utils/api";

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
    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
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
          ☰
        </button>
        <button
          className="icon-btn topbar__collapse"
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span aria-hidden>{sidebarCollapsed ? "»" : "«"}</span>
        </button>
        <div>
          <h1 className="topbar__title">{title}</h1>
          <p className="topbar__subtitle">Admin workspace</p>
        </div>
      </div>

      <div className="topbar__actions">
        <button className="icon-btn" type="button" aria-label="Notifications" onClick={() => navigate("/admin/notifications")}>
          <span aria-hidden>🔔</span>
          {unreadCount > 0 ? <span className="icon-btn__badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
        </button>

        <div className="topbar__user">
          <span className="topbar__avatar" aria-hidden>
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div className="topbar__user-info">
            <p className="topbar__user-name">{displayName}</p>
            <p className="topbar__user-role">{user.role}</p>
          </div>
          <button className="btn btn--ghost topbar__logout" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
