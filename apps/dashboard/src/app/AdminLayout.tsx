import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { getAdminRouteTitle } from "./adminRoutes";
import { clearAuth, getUser } from "../utils/auth";

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [user, setUserState] = useState(() => getUser());
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getAdminRouteTitle(location.pathname);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const refreshUser = () => {
      setUserState(getUser());
    };

    window.addEventListener("storage", refreshUser);
    window.addEventListener("dh-auth-updated", refreshUser as EventListener);

    return () => {
      window.removeEventListener("storage", refreshUser);
      window.removeEventListener("dh-auth-updated", refreshUser as EventListener);
    };
  }, []);

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
    clearAuth();
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <div className="dashboard-root">
      <div className="dashboard-shell">
        <aside
          className={sidebarCollapsed ? "sidebar-desktop sidebar-desktop--collapsed" : "sidebar-desktop"}
          aria-label="Sidebar"
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            user={user}
            onLogout={handleLogout}
            onToggleTheme={() => setIsDark((current) => !current)}
            isDark={isDark}
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
                user={user}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
                onToggleTheme={() => setIsDark((current) => !current)}
                isDark={isDark}
              />
            </aside>
          </div>
        ) : null}

        <main className="content-area">
          <Topbar
            title={pageTitle}
            user={user}
            onToggleMenu={() => setMobileOpen((current) => !current)}
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
            sidebarCollapsed={sidebarCollapsed}
            onLogout={handleLogout}
          />
          <div key={location.pathname} className="content-route-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
