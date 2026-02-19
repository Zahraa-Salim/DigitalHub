import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { RequireAdmin } from "./RequireAdmin";
import { adminRoutes } from "./adminRoutes";
import { LoginPage } from "../pages/LoginPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            {adminRoutes.map((route) =>
              route.index ? (
                <Route index key="admin-index" element={route.element} />
              ) : (
                <Route path={route.path} key={route.path} element={route.element} />
              ),
            )}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
