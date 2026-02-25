import type { ReactNode } from "react";
import { ActivityLogsPage } from "../pages/admin/ActivityLogsPage";
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
};

export const navConfig: NavItem[] = [
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

const titleEntries = navConfig.flatMap((item) => {
  if (item.path) {
    return [[item.path, item.label] as const];
  }

  return (item.children ?? []).map((child) => [child.path, child.label] as const);
});

const titleByPath = new Map<string, string>(titleEntries);
titleByPath.set("/admin/profile", "My Profile");

export function getAdminRouteTitle(pathname: string): string {
  if (pathname === "/admin") {
    return "Overview";
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
];
