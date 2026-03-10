// File: frontend/src/dashboard/app/adminRoutes.tsx
// Purpose: Defines dashboard app behavior for admin routes.
// It wires route guards, layouts, and route configuration for the admin experience.

import { lazy, type ReactNode } from "react";
import type { AdminRole } from "../utils/auth";
import { RequireSuperAdmin } from "./RequireSuperAdmin";

const ActivityLogsPage = lazy(() => import("../pages/admin/ActivityLogsPage").then((module) => ({ default: module.ActivityLogsPage })));
const AnnouncementsPage = lazy(() => import("../pages/admin/AnnouncementsPage").then((module) => ({ default: module.AnnouncementsPage })));
const AdmissionsPage = lazy(() => import("../pages/admin/AdmissionsPage").then((module) => ({ default: module.AdmissionsPage })));
const GeneralApplyPage = lazy(() => import("../pages/admin/GeneralApplyPage").then((module) => ({ default: module.GeneralApplyPage })));
const CmsHomeSectionsPage = lazy(() => import("../pages/admin/CmsHomeSectionsPage").then((module) => ({ default: module.CmsHomeSectionsPage })));
const CmsPagesPage = lazy(() => import("../pages/admin/CmsPagesPage").then((module) => ({ default: module.CmsPagesPage })));
const CmsSiteSettingsPage = lazy(() => import("../pages/admin/CmsSiteSettingsPage").then((module) => ({ default: module.CmsSiteSettingsPage })));
const CmsThemeTokensPage = lazy(() => import("../pages/admin/CmsThemeTokensPage").then((module) => ({ default: module.CmsThemeTokensPage })));
const CohortsPage = lazy(() => import("../pages/admin/CohortsPage").then((module) => ({ default: module.CohortsPage })));
const ContactInboxPage = lazy(() => import("../pages/admin/ContactInboxPage").then((module) => ({ default: module.ContactInboxPage })));
const EventsPage = lazy(() => import("../pages/admin/EventsPage").then((module) => ({ default: module.EventsPage })));
const FormsPage = lazy(() => import("../pages/admin/FormsPage").then((module) => ({ default: module.FormsPage })));
const AttendancePage = lazy(() => import("../pages/admin/AttendancePage").then((module) => ({ default: module.AttendancePage })));
const AdminManagementPage = lazy(() => import("../pages/admin/AdminManagementPage").then((module) => ({ default: module.AdminManagementPage })));
const MyProfilePage = lazy(() => import("../pages/admin/MyProfilePage").then((module) => ({ default: module.MyProfilePage })));
const MessageTemplatesPage = lazy(() => import("../pages/admin/MessageTemplatesPage").then((module) => ({ default: module.MessageTemplatesPage })));
const MessagesPage = lazy(() => import("../pages/admin/MessagesPage").then((module) => ({ default: module.MessagesPage })));
const NotificationsPage = lazy(() => import("../pages/admin/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const ProfilesInstructorsPage = lazy(() => import("../pages/admin/ProfilesInstructorsPage").then((module) => ({ default: module.ProfilesInstructorsPage })));
const ProfilesManagersPage = lazy(() => import("../pages/admin/ProfilesManagersPage").then((module) => ({ default: module.ProfilesManagersPage })));
const ProfilesStudentsPage = lazy(() => import("../pages/admin/ProfilesStudentsPage").then((module) => ({ default: module.ProfilesStudentsPage })));
const ProgramsPage = lazy(() => import("../pages/admin/ProgramsPage").then((module) => ({ default: module.ProgramsPage })));
const OverviewPage = lazy(() => import("../pages/OverviewPage").then((module) => ({ default: module.OverviewPage })));

export type NavLeaf = {
  label: string;
  path: string;
  requiresSuperAdmin?: boolean;
};

export type NavItem = {
  label: string;
  path?: string;
  children?: NavLeaf[];
  requiresSuperAdmin?: boolean;
};

export type AdminRoute = {
  path?: string;
  index?: boolean;
  element: ReactNode;
  roles?: AdminRole[];
};

export const navConfig: NavItem[] = [
  { label: "Dashboard", path: "/admin" },
  { label: "Applications", path: "/admin/admissions" },
  { label: "General Apply", path: "/admin/general-apply" },
  { label: "Application Forms", path: "/admin/forms" },
  { label: "Message Templates", path: "/admin/message-templates" },
  {
    label: "Operations",
    children: [
      { label: "Attendance", path: "/admin/attendance" },
      { label: "Cohorts", path: "/admin/cohorts" },
      { label: "Programs", path: "/admin/programs" },
      { label: "Events", path: "/admin/events" },
      { label: "Announcements", path: "/admin/announcements" },
    ],
  },
  {
    label: "CMS",
    children: [
      { label: "Site Settings", path: "/admin/cms/site-settings" },
      { label: "Pages", path: "/admin/cms/pages" },
      { label: "Home Sections", path: "/admin/cms/home-sections" },
      { label: "Theme Tokens", path: "/admin/cms/theme" },
    ],
  },
  {
    label: "Profiles",
    children: [
      { label: "Instructors", path: "/admin/profiles/instructors" },
      { label: "Managers", path: "/admin/profiles/managers" },
      { label: "Students", path: "/admin/profiles/students" },
    ],
  },
  { label: "Contact Inbox", path: "/admin/contact" },
  { label: "Activity Logs", path: "/admin/logs" },
  { label: "Admin Management", path: "/admin/admins", requiresSuperAdmin: true },
];

const titleEntries = navConfig.flatMap((item) => {
  if (item.path) {
    return [[item.path, item.label] as const];
  }

  return (item.children ?? []).map((child) => [child.path, child.label] as const);
});

const titleByPath = new Map<string, string>(titleEntries);
titleByPath.set("/admin/profile", "My Profile");
titleByPath.set("/admin/messages", "Message Delivery Details");

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
  { path: "admissions", element: <AdmissionsPage /> },
  { path: "general-apply", element: <GeneralApplyPage /> },
  { path: "forms", element: <FormsPage /> },
  { path: "message-templates", element: <MessageTemplatesPage /> },
  { path: "messages", element: <MessagesPage /> },
  { path: "attendance", element: <AttendancePage /> },
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
  {
    path: "admins",
    element: (
      <RequireSuperAdmin>
        <AdminManagementPage />
      </RequireSuperAdmin>
    ),
  },
  { path: "profile", element: <MyProfilePage /> },
];

