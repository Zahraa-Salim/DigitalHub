// File: frontend/src/dashboard/app/AppRouter.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { RequireAdmin } from "./RequireAdmin";
import { RequireRole } from "./RequireRole";
import { adminRoutes } from "./adminRoutes";

const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() =>
  import("../pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("../pages/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })),
);

function RouteFallback() {
  return <div style={{ padding: "24px", color: "#23314f" }}>Loading...</div>;
}

export function AppRouter() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<RouteFallback />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ForgotPasswordPage />
            </Suspense>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ResetPasswordPage />
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
