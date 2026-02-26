import type { ReactNode } from "react";
import type { AdminRole } from "../utils/auth";
import { ActivityLogsPage } from "../pages/admin/ActivityLogsPage";
import { AdminCreatePage } from "../pages/admin/AdminCreatePage";
import { AdminDetailsPage } from "../pages/admin/AdminDetailsPage";
import { AdminsPage } from "../pages/admin/AdminsPage";
import { AnnouncementsPage } from "../pages/admin/AnnouncementsPage";
import { ApplicationsPage } from "../pages/admin/ApplicationsPage";
import { CmsHomeSectionsPage } from "../pages/admin/CmsHomeSectionsPage";
import { CmsPagesPage } from "../pages/admin/CmsPagesPage";
import { CmsSiteSettingsPage } from "../pages/admin/CmsSiteSettingsPage";
import { CmsThemeTokensPage } from "../pages/admin/CmsThemeTokensPage";
import { CohortsPage } from "../pages/admin/CohortsPage";
import { ContactInboxPage } from "../pages/admin/ContactInboxPage";
import { EventsPage } from "../pages/admin/EventsPage";
import { MyProfilePage } from "../pages/admin/MyProfilePage";
import { NotificationsPage } from "../pages/admin/NotificationsPage";
import { ProfilesInstructorsPage } from "../pages/admin/ProfilesInstructorsPage";
import { ProfilesManagersPage } from "../pages/admin/ProfilesManagersPage";
import { ProfilesStudentsPage } from "../pages/admin/ProfilesStudentsPage";
import { ProgramsPage } from "../pages/admin/ProgramsPage";
import { OverviewPage } from "../pages/OverviewPage";

export type NavLeaf = {
  label: string;
  path: string;
};

export type NavItem = {
  label: string;
  path?: string;
  children?: NavLeaf[];
};

export type AdminRoute = {
  path?: string;
  index?: boolean;
  element: ReactNode;
  roles?: AdminRole[];
};

export function getNavConfig(role: AdminRole): NavItem[] {
  const base: NavItem[] = [
    { label: "Dashboard", path: "/admin" },
    { label: "Applications", path: "/admin/applications" },
    { label: "Cohorts", path: "/admin/cohorts" },
    { label: "Programs", path: "/admin/programs" },
    {
      label: "CMS",
      children: [
        { label: "Site Settings", path: "/admin/cms/site-settings" },
        { label: "Pages", path: "/admin/cms/pages" },
        { label: "Home Sections", path: "/admin/cms/home-sections" },
        { label: "Theme Tokens", path: "/admin/cms/theme" },
      ],
    },
    { label: "Announcements", path: "/admin/announcements" },
    { label: "Events", path: "/admin/events" },
    {
      label: "Profiles",
      children: [
        { label: "Instructors", path: "/admin/profiles/instructors" },
      ],
    },
    { label: "Contact Inbox", path: "/admin/contact" },
    { label: "Notifications", path: "/admin/notifications" },
    { label: "Activity Logs", path: "/admin/logs" },
  ];

  if (role === "super_admin") {
    base.push({ label: "Admin Management", path: "/admin/admins" });
  }

  return base;
}

function buildTitleMap() {
  const merged = [...getNavConfig("admin"), ...getNavConfig("super_admin")];
  const titleEntries = merged.flatMap((item) => {
    if (item.path) {
      return [[item.path, item.label] as const];
    }

    return (item.children ?? []).map((child) => [child.path, child.label] as const);
  });
  const map = new Map<string, string>(titleEntries);
  map.set("/admin/profile", "My Profile");
  map.set("/admin/admins/create", "Create Admin");
  return map;
}

const titleByPath = buildTitleMap();

export function getAdminRouteTitle(pathname: string): string {
  if (pathname === "/admin") {
    return "Overview";
  }
  if (pathname.startsWith("/admin/admins/")) {
    return pathname === "/admin/admins/create" ? "Create Admin" : "Admin Details";
  }

  if (titleByPath.has(pathname)) {
    return titleByPath.get(pathname) ?? "Admin";
  }

  return "Admin";
}

export const adminRoutes: AdminRoute[] = [
  { index: true, element: <OverviewPage /> },
  { path: "applications", element: <ApplicationsPage /> },
  { path: "cohorts", element: <CohortsPage /> },
  { path: "programs", element: <ProgramsPage /> },
  { path: "cms/site-settings", element: <CmsSiteSettingsPage /> },
  { path: "cms/pages", element: <CmsPagesPage /> },
  { path: "cms/home-sections", element: <CmsHomeSectionsPage /> },
  { path: "cms/theme", element: <CmsThemeTokensPage /> },
  { path: "announcements", element: <AnnouncementsPage /> },
  { path: "events", element: <EventsPage /> },
  { path: "profiles/students", element: <ProfilesStudentsPage /> },
  { path: "profiles/instructors", element: <ProfilesInstructorsPage /> },
  { path: "profiles/managers", element: <ProfilesManagersPage /> },
  { path: "contact", element: <ContactInboxPage /> },
  { path: "notifications", element: <NotificationsPage /> },
  { path: "logs", element: <ActivityLogsPage /> },
  { path: "profile", element: <MyProfilePage /> },
  { path: "admins", element: <AdminsPage />, roles: ["super_admin"] },
  { path: "admins/create", element: <AdminCreatePage />, roles: ["super_admin"] },
  { path: "admins/:id", element: <AdminDetailsPage />, roles: ["super_admin"] },
];
