import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { GlobalMessageHub } from "../components/GlobalMessageHub";
import { GlobalMessagingProvider } from "../components/GlobalMessagingContext";
import { Sidebar } from "../components/Sidebar";
import { ApiError, api } from "../utils/api";
import { clearAuth, getUser, setUser } from "../utils/auth";

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [user, setUserState] = useState(() => getUser());
  const location = useLocation();
  const navigate = useNavigate();
  const showGlobalMessageHub =
    location.pathname.startsWith("/admin/admissions") ||
    location.pathname.startsWith("/admin/general-apply");

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
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const me = await api<Record<string, unknown>>("/auth/me");
        setUser(me);
        if (active) {
          setUserState(getUser());
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAuth();
          navigate("/login", { replace: true });
        }
      }
    };

    void loadCurrentUser();
    return () => {
      active = false;
    };
  }, [navigate]);

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
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
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
