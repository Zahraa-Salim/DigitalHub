import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getAdminRouteTitle } from "./adminRoutes";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { clearAuth, getUser } from "../utils/auth";
import { cn } from "../utils/cn";

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const user = useMemo(() => getUser(), []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
          className={cn("sidebar-desktop", isSidebarCollapsed && "sidebar-desktop--collapsed")}
          aria-label="Sidebar"
        >
          <Sidebar
            collapsed={isSidebarCollapsed}
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
            title={getAdminRouteTitle(location.pathname)}
            user={user}
            onToggleMenu={() => setMobileOpen((current) => !current)}
            onToggleSidebar={() => setIsSidebarCollapsed((current) => !current)}
            sidebarCollapsed={isSidebarCollapsed}
            onLogout={handleLogout}
          />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
