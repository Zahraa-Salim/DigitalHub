// File: frontend/src/dashboard/app/AdminLayout.tsx
// Purpose: Defines dashboard app behavior for admin layout.
// It wires route guards, layouts, and route configuration for the admin experience.

import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { GlobalMessageHub } from "../components/GlobalMessageHub";
import { GlobalMessagingProvider } from "../components/GlobalMessagingContext";
import { Sidebar } from "../components/Sidebar";
import { useAuthStore } from "../stores/useAuthStore";
import { ApiError, api } from "../utils/api";
import { normalizeUser } from "../utils/auth";

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const user = useAuthStore((state) => state.user);
  const storeSetAuth = useAuthStore((state) => state.setAuth);
  const storeClearAuth = useAuthStore((state) => state.clearAuth);
  const location = useLocation();
  const navigate = useNavigate();
  const showGlobalMessageHub =
    location.pathname.startsWith("/admin/admissions") ||
    location.pathname.startsWith("/admin/general-apply");

  useEffect(() => {
    // Always force light mode — dark mode is disabled
    document.documentElement.classList.remove("dark");
    window.localStorage.removeItem("dh-theme");
  }, []);

  useEffect(() => {
    const closeTimer = window.setTimeout(() => {
      setMobileOpen(false);
    }, 0);
    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [location.pathname]);

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const me = await api<Record<string, unknown>>("/auth/me");
        if (active) {
          const currentToken = useAuthStore.getState().token ?? "";
          storeSetAuth(currentToken, me);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          storeClearAuth();
          navigate("/login", { replace: true });
        }
      }
    };

    void loadCurrentUser();
    return () => {
      active = false;
    };
  }, [navigate, storeClearAuth, storeSetAuth]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [mobileOpen]);

  const handleLogout = useCallback(() => {
    storeClearAuth();
    navigate("/login", { replace: true });
  }, [navigate, storeClearAuth]);

  return (
    <div className="dashboard-root">
      <div className="dashboard-shell">
        <aside
          className={sidebarCollapsed ? "sidebar-desktop sidebar-desktop--collapsed" : "sidebar-desktop"}
          aria-label="Sidebar"
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
            user={user ?? normalizeUser(null)}
            onLogout={handleLogout}
          />
        </aside>

        {mobileOpen ? (
          <div className="sidebar-mobile-layer">
            <button
              className="sidebar-mobile-backdrop"
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            />
            <aside className="sidebar-mobile-drawer">
              <Sidebar
                collapsed={false}
                user={user ?? normalizeUser(null)}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
              />
            </aside>
          </div>
        ) : null}

        <main className="content-area">
          <button
            className="mobile-menu-btn mobile-only content-area__mobile-trigger"
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Open navigation menu"
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <GlobalMessagingProvider>
            <div key={location.pathname} className="content-route-transition">
              <Outlet />
            </div>
            {showGlobalMessageHub ? <GlobalMessageHub /> : null}
          </GlobalMessagingProvider>
        </main>
      </div>
    </div>
  );
}

