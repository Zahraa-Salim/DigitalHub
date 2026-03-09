import { AdminLayout } from "@dashboard/app/AdminLayout";
import { adminRoutes } from "@dashboard/app/adminRoutes";
import { RequireAdmin } from "@dashboard/app/RequireAdmin";
import { RequireRole } from "@dashboard/app/RequireRole";
import dashboardStyles from "@dashboard/styles/global.css?inline";
import { Suspense, lazy, type ReactNode, useEffect } from "react";
import { Route } from "react-router-dom";

const LoginPage = lazy(() =>
  import("@dashboard/pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("@dashboard/pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("@dashboard/pages/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })),
);

const DASHBOARD_STYLES_ATTR = "data-dashboard-styles";
let dashboardStyleRefCount = 0;
let dashboardStyleTag: HTMLStyleElement | null = null;

function DashboardStylesBoundary({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!dashboardStyleTag) {
      const existing = document.querySelector(`style[${DASHBOARD_STYLES_ATTR}]`);
      if (existing instanceof HTMLStyleElement) {
        dashboardStyleTag = existing;
      } else {
        dashboardStyleTag = document.createElement("style");
        dashboardStyleTag.setAttribute(DASHBOARD_STYLES_ATTR, "true");
        dashboardStyleTag.textContent = dashboardStyles;
        document.head.appendChild(dashboardStyleTag);
      }
    }
    dashboardStyleRefCount += 1;

    return () => {
      dashboardStyleRefCount = Math.max(0, dashboardStyleRefCount - 1);
      if (dashboardStyleRefCount === 0 && dashboardStyleTag) {
        dashboardStyleTag.remove();
        dashboardStyleTag = null;
      }
    };
  }, []);

  return <>{children}</>;
}

const routeFallback = <div style={{ padding: 24, color: "#23314f" }}>Loading...</div>;

const withDashboardStyles = (element: ReactNode) => (
  <DashboardStylesBoundary>{element}</DashboardStylesBoundary>
);

export function DashboardRouteElements() {
  return (
    <>
      <Route
        path="/login"
        element={withDashboardStyles(
          <Suspense fallback={routeFallback}>
            <LoginPage />
          </Suspense>,
        )}
      />
      <Route
        path="/forgot-password"
        element={withDashboardStyles(
          <Suspense fallback={routeFallback}>
            <ForgotPasswordPage />
          </Suspense>,
        )}
      />
      <Route
        path="/reset-password/:token"
        element={withDashboardStyles(
          <Suspense fallback={routeFallback}>
            <ResetPasswordPage />
          </Suspense>,
        )}
      />

      <Route element={withDashboardStyles(<RequireAdmin />)}>
        <Route path="/admin" element={<AdminLayout />}>
          {adminRoutes.map((route) =>
            route.index ? (
              <Route
                index
                key="admin-index"
                element={<Suspense fallback={routeFallback}>{route.element}</Suspense>}
              />
            ) : (
              <Route
                path={route.path}
                key={route.path}
                element={
                  <Suspense fallback={routeFallback}>
                    {route.roles ? (
                      <RequireRole allowedRoles={route.roles}>{route.element}</RequireRole>
                    ) : (
                      route.element
                    )}
                  </Suspense>
                }
              />
            ),
          )}
        </Route>
      </Route>
    </>
  );
}
