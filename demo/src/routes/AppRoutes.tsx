import MainLayout from "@/layout/MainLayout";
import NotFoundPage from "@/pages/not-found";
import TestPage from "@/pages/test";
import type { ComponentType } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

type PageModule = { default: ComponentType };

const pageModules = import.meta.glob<PageModule>("/src/pages/*.tsx", {
  eager: true,
});

const toRoutePath = (name: string) => {
  if (name === "home") return "/";
  if (name === "course-details-id") return "/course-details/:id";
  if (name === "shop-details-id") return "/shop-details/:id";
  if (name === "events-slug") return "/events/:slug";
  return `/${name}`;
};

const pageRoutes = Object.entries(pageModules)
  .map(([filePath, mod]) => {
    const fileName = filePath.split("/").pop()?.replace(".tsx", "") ?? "";
    return {
      fileName,
      routePath: toRoutePath(fileName),
      Page: mod.default,
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
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/test-layout" element={<TestPage />} />
        </Route>
        {pageRoutes.map(({ routePath, Page }) => (
          <Route key={routePath} path={routePath} element={<Page />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
