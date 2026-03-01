import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { navConfig } from "../app/adminRoutes";
import { cn } from "../utils/cn";
import { isSuperAdminUser, type AuthUser } from "../utils/auth";
import { apiList } from "../utils/api";
import { NOTIFICATIONS_UPDATED_EVENT } from "../utils/notifications";

type SidebarProps = {
  user: AuthUser;
  collapsed: boolean;
  onToggleSidebar?: () => void;
  onNavigate?: () => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
};

function icon(children: ReactNode) {
  return <svg viewBox="0 0 24 24" aria-hidden>{children}</svg>;
}

function getNavIcon(path: string | undefined, label: string): ReactNode {
  const key = path ?? label;

  switch (key) {
    case "/admin":
      return icon(
        <>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </>,
      );
    case "/admin/applications":
    case "/admin/admissions":
    case "/admin/general-apply":
    case "/admin/forms":
    case "/admin/message-templates":
      return icon(
        <>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </>,
      );
    case "/admin/cohorts":
    case "/admin/profiles/students":
    case "/admin/profiles/instructors":
    case "/admin/profiles/managers":
    case "Profiles":
      return icon(
        <>
          <circle cx="9" cy="9" r="3" />
          <circle cx="16.5" cy="10.5" r="2.5" />
          <path d="M4.5 19a4.5 4.5 0 0 1 9 0M13.5 19a3 3 0 0 1 6 0" />
        </>,
      );
    case "/admin/programs":
      return icon(
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
          <path d="M4 5.5V21M8 7h8M8 11h8" />
        </>,
      );
    case "Operations":
      return icon(
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 4v16M14 4v16" />
        </>,
      );
    case "CMS":
      return icon(
        <>
          <path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h4" />
        </>,
      );
    case "/admin/cms/site-settings":
      return icon(
        <>
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M18.4 5.6l-2.2 2.2M7.8 16.2l-2.2 2.2" />
        </>,
      );
    case "/admin/cms/pages":
      return icon(
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </>,
      );
    case "/admin/cms/home-sections":
      return icon(
        <>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10.5V20h14v-9.5" />
        </>,
      );
    case "/admin/cms/theme":
      return icon(
        <>
          <path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3 3h-2a2.5 2.5 0 0 0 0 5h.5" />
          <circle cx="7.5" cy="10" r="1" />
          <circle cx="10" cy="7" r="1" />
          <circle cx="14.5" cy="7" r="1" />
        </>,
      );
    case "/admin/announcements":
      return icon(
        <>
          <path d="M4 14V10l11-5v14z" />
          <path d="M15 9h3a3 3 0 0 1 0 6h-3" />
          <path d="M7 14v3a2 2 0 0 0 4 0v-1" />
        </>,
      );
    case "/admin/events":
      return icon(
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </>,
      );
    case "/admin/contact":
      return icon(
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="m4 8 8 6 8-6" />
        </>,
      );
    case "/admin/notifications":
      return icon(
        <>
          <path d="M6 9a6 6 0 0 1 12 0v5l2 2H4l2-2z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </>,
      );
    case "/admin/logs":
      return icon(
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h6" />
        </>,
      );
    case "/admin/profile":
      return icon(
        <>
          <circle cx="12" cy="9" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </>,
      );
    case "/admin/admins":
      return icon(
        <>
          <circle cx="8" cy="9" r="2.5" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M3.5 18a4.5 4.5 0 0 1 9 0" />
          <path d="M11.5 18a4.5 4.5 0 0 1 9 0" />
        </>,
      );
    default:
      return icon(<circle cx="12" cy="12" r="3" />);
  }
}

function toInitialOpen(pathname: string): Record<string, boolean> {
  const initial: Record<string, boolean> = {};

  navConfig.forEach((item) => {
    if (!item.children) {
      return;
    }

    initial[item.label] = item.children.some((child) => child.path === pathname);
  });

  return initial;
}

export function Sidebar({ user, collapsed, onToggleSidebar, onNavigate, onLogout, isDark, onToggleTheme }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    toInitialOpen(location.pathname),
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [footerCollapsed, setFooterCollapsed] = useState(false);

  const displayName = user.full_name || "Admin";
  const isSuperAdmin = isSuperAdminUser(user);
  const roleLabel =
    typeof user.role_label === "string" && user.role_label.trim()
      ? user.role_label
      : isSuperAdmin
        ? "Super Admin"
        : "Admin";
  const profileBadgeLabel =
    typeof user.job_title === "string" && user.job_title.trim()
      ? user.job_title.trim()
      : roleLabel;

  useEffect(() => {
    navConfig.forEach((item) => {
      if (!item.children) {
        return;
      }

      const hasActiveChild = item.children.some((child) => child.path === location.pathname);
      if (hasActiveChild) {
        setOpenGroups((current) => ({ ...current, [item.label]: true }));
      }
    });
  }, [location.pathname]);

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

  const activeGroup = useMemo(() => {
    const active: Record<string, boolean> = {};

    navConfig.forEach((item) => {
      if (!item.children) {
        return;
      }

      active[item.label] = item.children.some((child) => child.path === location.pathname);
    });

    return active;
  }, [location.pathname]);

  const visibleNavConfig = useMemo(
    () =>
      navConfig
        .filter((item) => !item.requiresSuperAdmin || isSuperAdmin)
        .map((item) => {
          if (!item.children) {
            return item;
          }

          return {
            ...item,
            children: item.children.filter((child) => !child.requiresSuperAdmin || isSuperAdmin),
          };
        })
        .filter((item) => !item.children || item.children.length > 0),
    [isSuperAdmin],
  );
  const canToggleSidebar = typeof onToggleSidebar === "function";
  const handleGroupToggle = (label: string) => {
    if (collapsed && canToggleSidebar) {
      setOpenGroups((current) => ({ ...current, [label]: true }));
      onToggleSidebar();
      return;
    }

    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  };

  return (
    <div className="sidebar-card">
      <div className="sidebar-brand">
        <div className="sidebar-brand__row">
          <div>
            <p className="sidebar-brand__eyebrow">Admin Dashboard</p>
            <h2 className="sidebar-brand__title">Digital Hub</h2>
          </div>
          {canToggleSidebar ? (
            <button
              className="sidebar-brand__toggle-btn"
              type="button"
              onClick={onToggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Sidebar Navigation">
        {visibleNavConfig.map((item) => {
          if (item.path) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn("sidebar-nav__link", isActive && "sidebar-nav__link--active")
                }
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-nav__icon" aria-hidden>
                  <span className="sidebar-nav__icon-glyph">{getNavIcon(item.path, item.label)}</span>
                </span>
                <span className="sidebar-nav__label">{item.label}</span>
                <span className="sidebar-nav__hover-label" aria-hidden>
                  {item.label}
                </span>
              </NavLink>
            );
          }

          const isOpen = !collapsed && openGroups[item.label];
          const isActive = activeGroup[item.label];

          return (
            <div className="sidebar-group" key={item.label}>
              <button
                className={cn(
                  "sidebar-nav__link",
                  "sidebar-nav__group-toggle",
                  isActive && "sidebar-nav__link--active",
                )}
                type="button"
                aria-label={`Toggle ${item.label}`}
                aria-expanded={isOpen}
                onClick={() => handleGroupToggle(item.label)}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-nav__icon" aria-hidden>
                  <span className="sidebar-nav__icon-glyph">{getNavIcon(item.path, item.label)}</span>
                </span>
                <span className="sidebar-nav__label">{item.label}</span>
                <span className={cn("sidebar-nav__caret", isOpen && "sidebar-nav__caret--open")} aria-hidden>
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
                <span className="sidebar-nav__hover-label" aria-hidden>
                  {item.label}
                </span>
              </button>

              <div className={cn("sidebar-nav__submenu", isOpen && "sidebar-nav__submenu--open")}>
                {(item.children ?? []).map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    onClick={onNavigate}
                    className={({ isActive: linkActive }) =>
                      cn("sidebar-nav__sublink", linkActive && "sidebar-nav__sublink--active")
                    }
                    aria-label={child.label}
                    title={collapsed ? child.label : undefined}
                  >
                    <span className="sidebar-nav__icon" aria-hidden>
                      <span className="sidebar-nav__icon-glyph">{getNavIcon(child.path, child.label)}</span>
                    </span>
                    <span className="sidebar-nav__label">{child.label}</span>
                    <span className="sidebar-nav__hover-label" aria-hidden>
                      {child.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className={cn("sidebar-footer", footerCollapsed && "sidebar-footer--collapsed")}>
        <button
          className={cn("sidebar-footer__toggle", footerCollapsed && "sidebar-footer__toggle--collapsed")}
          type="button"
          onClick={() => setFooterCollapsed((current) => !current)}
          aria-expanded={!footerCollapsed}
          aria-label={footerCollapsed ? "Show account card" : "Hide account card"}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div className="sidebar-footer__card">
          <div className="sidebar-profile-row">
            <div className="sidebar-profile">
              <div className="sidebar-profile__info">
                <button
                  className="sidebar-profile__name sidebar-profile__name-btn"
                  type="button"
                  onClick={() => {
                    navigate("/admin/profile");
                    onNavigate?.();
                  }}
                >
                  {displayName}
                </button>
                <span className="sidebar-profile__role">{profileBadgeLabel}</span>
              </div>
            </div>

            <div className="sidebar-profile-actions">
              <button
                className="icon-btn"
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  navigate("/admin/notifications");
                  onNavigate?.();
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M6 9a6 6 0 0 1 12 0v5l2 2H4l2-2z" />
                  <path d="M10 18a2 2 0 0 0 4 0" />
                </svg>
                {unreadCount > 0 ? (
                  <span className="icon-btn__badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                ) : null}
              </button>

              {!collapsed ? (
                <button
                  className={cn("theme-toggle", isDark && "theme-toggle--dark")}
                  onClick={onToggleTheme}
                  type="button"
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  <span className="theme-toggle__icon" aria-hidden>
                    {isDark ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                      </svg>
                    )}
                  </span>
                </button>
              ) : null}
            </div>
          </div>

          <button className="btn btn--secondary btn--full sidebar-logout-btn" type="button" onClick={onLogout} aria-label="Logout">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
