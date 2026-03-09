// File: frontend/src/routes/AppRoutes.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
import NotFoundPage from "@/pages/not-found";
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardRouteElements } from "./DashboardRoutes";

type PageModule = { default: ComponentType };

const pageModules = import.meta.glob<PageModule>(["../pages/*.tsx", "!../pages/not-found.tsx"]);

const toRoutePath = (name: string) => {
  if (name === "home") return "/";
  if (name === "course-details-id") return "/course-details/:id";
  if (name === "cohorts-id") return "/cohorts/:id";
  if (name === "shop-details-id") return "/shop-details/:id";
  if (name === "events-slug") return "/events/:slug";
  return `/${name}`;
};

const pageRoutes = Object.entries(pageModules)
  .map(([filePath, loader]) => {
    const fileName = filePath.split("/").pop()?.replace(".tsx", "") ?? "";
    return {
      fileName,
      routePath: toRoutePath(fileName),
      Page: lazy(loader) as LazyExoticComponent<ComponentType>,
    };
  })
  .filter((route) => route.fileName && route.fileName !== "not-found")
  .sort((a, b) => {
    if (a.routePath === "/") return -1;
    if (b.routePath === "/") return 1;
    return a.routePath.localeCompare(b.routePath);
  });

const AppRoutes = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {DashboardRouteElements()}
        <Route path="/dashboard/*" element={<Navigate to="/admin" replace />} />
        {pageRoutes.map(({ routePath, Page }) => (
          <Route
            key={routePath}
            path={routePath}
            element={
              <Suspense fallback={null}>
                <Page />
              </Suspense>
            }
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
