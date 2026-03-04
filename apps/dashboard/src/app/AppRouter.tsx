import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { RequireAdmin } from "./RequireAdmin";
import { RequireRole } from "./RequireRole";
import { adminRoutes } from "./adminRoutes";

const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));

function RouteFallback() {
  return <div style={{ padding: "24px", color: "#23314f" }}>Loading...</div>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<RouteFallback />}>
              <LoginPage />
            </Suspense>
          }
        />

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            {adminRoutes.map((route) =>
              route.index ? (
                <Route
                  index
                  key="admin-index"
                  element={<Suspense fallback={<RouteFallback />}>{route.element}</Suspense>}
                />
              ) : (
                <Route
                  path={route.path}
                  key={route.path}
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      {route.roles ? <RequireRole allowedRoles={route.roles}>{route.element}</RequireRole> : route.element}
                    </Suspense>
                  }
                />
              ),
            )}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
