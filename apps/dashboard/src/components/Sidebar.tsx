import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { navConfig } from "../app/adminRoutes";
import { cn } from "../utils/cn";
import type { AuthUser } from "../utils/auth";

type SidebarProps = {
  user: AuthUser;
  collapsed: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
};

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

export function Sidebar({ user, collapsed, onNavigate, onLogout, isDark, onToggleTheme }: SidebarProps) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    toInitialOpen(location.pathname),
  );

  const displayName = user.full_name || "Admin";

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

  return (
    <div className="sidebar-card">
      <div className="sidebar-brand">
        <p className="sidebar-brand__eyebrow">Admin Dashboard</p>
        <h2 className="sidebar-brand__title">Digital Hub</h2>
      </div>

      <nav className="sidebar-nav" aria-label="Sidebar Navigation">
        {navConfig.map((item) => {
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
                  <span className="sidebar-nav__icon-dot" />
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
                onClick={() => setOpenGroups((current) => ({ ...current, [item.label]: !isOpen }))}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-nav__icon" aria-hidden>
                  <span className="sidebar-nav__icon-dot" />
                </span>
                <span className="sidebar-nav__label">{item.label}</span>
                <span className={cn("sidebar-nav__caret", isOpen && "sidebar-nav__caret--open")} aria-hidden>
                  ▾
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
                      <span className="sidebar-nav__icon-dot" />
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

      <div className="sidebar-footer">
        <div className="sidebar-profile-row">
          <div className="sidebar-profile">
            <span className="sidebar-profile__icon" aria-hidden>
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div className="sidebar-profile__info">
              <p className="sidebar-profile__name">{displayName}</p>
              <p className="sidebar-profile__email">{user.email || "admin@digitalhub.com"}</p>
              <span className="sidebar-profile__role">{user.role}</span>
            </div>
          </div>
          <button
            className={cn("theme-toggle", isDark && "theme-toggle--dark")}
            onClick={onToggleTheme}
            type="button"
            aria-label="Toggle theme"
          >
            <span className="theme-toggle__icon" aria-hidden>
              {isDark ? "☾" : "☀"}
            </span>
            <span className="theme-toggle__knob" />
          </button>
        </div>

        <button className="btn btn--secondary btn--full" type="button" onClick={onLogout} aria-label="Logout">
          Logout
        </button>
      </div>
    </div>
  );
}
