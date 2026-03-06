import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { clearAuth, getUser } from "../utils/auth";

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
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
          className="sidebar-desktop"
          aria-label="Sidebar"
        >
          <Sidebar
            collapsed={false}
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
          <div key={location.pathname} className="content-route-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
