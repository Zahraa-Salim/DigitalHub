export type Program = {
  id: number;
  title: string;
  updated_at: string;
  is_published: boolean;
};

export type CohortStatus = "open" | "running" | "completed" | "coming_soon";

export type Cohort = {
  id: number;
  name: string;
  status: CohortStatus;
  start_date: string;
};

export type ApplicationStatus = "pending" | "approved" | "rejected" | "waitlisted";

export type Application = {
  id: number;
  name: string;
  email: string;
  status: ApplicationStatus;
  submitted_at: string;
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export type ActivityLog = {
  id: number;
  action: string;
  entity_type: string;
  message: string;
  created_at: string;
};

export const programs: Program[] = [
  { id: 1, title: "Full Stack Development", updated_at: "2026-02-18T12:00:00Z", is_published: true },
  { id: 2, title: "UI/UX Design", updated_at: "2026-02-17T09:30:00Z", is_published: true },
  { id: 3, title: "Data Analytics", updated_at: "2026-02-15T14:10:00Z", is_published: false },
  { id: 4, title: "Cloud Foundations", updated_at: "2026-02-14T08:45:00Z", is_published: true },
];

export const cohorts: Cohort[] = [
  { id: 101, name: "FS-2026-Q1", status: "open", start_date: "2026-03-01" },
  { id: 102, name: "UX-2026-Q1", status: "running", start_date: "2026-01-15" },
  { id: 103, name: "DA-2025-Q4", status: "completed", start_date: "2025-10-01" },
  { id: 104, name: "Cloud-2026-Q2", status: "coming_soon", start_date: "2026-05-10" },
];

export const applications: Application[] = [
  { id: 1001, name: "Lina Saad", email: "lina@example.com", status: "pending", submitted_at: "2026-02-19T07:20:00Z" },
  { id: 1002, name: "Omar Adel", email: "omar@example.com", status: "approved", submitted_at: "2026-02-18T10:10:00Z" },
  { id: 1003, name: "Nora Fares", email: "nora@example.com", status: "waitlisted", submitted_at: "2026-02-17T16:05:00Z" },
  { id: 1004, name: "Samir Hassan", email: "samir@example.com", status: "rejected", submitted_at: "2026-02-16T13:30:00Z" },
];

export const notifications: Notification[] = [
  { id: 1, title: "New Application", body: "A new application was submitted for FS-2026-Q1.", is_read: false, created_at: "2026-02-19T08:00:00Z" },
  { id: 2, title: "Theme Updated", body: "Admin updated web theme token --primary.", is_read: true, created_at: "2026-02-19T05:40:00Z" },
  { id: 3, title: "Cohort Opened", body: "Cloud-2026-Q2 is now open for applications.", is_read: false, created_at: "2026-02-18T14:10:00Z" },
];

export const logs: ActivityLog[] = [
  { id: 1, action: "edit programs", entity_type: "programs", message: "Program Data Analytics was unpublished.", created_at: "2026-02-19T07:50:00Z" },
  { id: 2, action: "approve application", entity_type: "applications", message: "Application #1002 approved and enrollment created.", created_at: "2026-02-18T10:20:00Z" },
  { id: 3, action: "edit home sections", entity_type: "home_sections", message: "Home hero section content updated.", created_at: "2026-02-18T09:00:00Z" },
  { id: 4, action: "create event", entity_type: "events", message: "Career fair event created for March 12.", created_at: "2026-02-17T15:45:00Z" },
];

export const profile = {
  name: "Admin User",
  email: "admin@digitalhub.local",
  role: "Super Admin",
  joined_at: "2025-03-12",
  bio: "Managing content, cohorts, and operational workflows for Digital Hub.",
};

export const overviewStats = [
  { label: "Programs", value: programs.length.toString(), hint: "Published and draft templates" },
  { label: "Open Cohorts", value: cohorts.filter((item) => item.status === "open").length.toString(), hint: "Accepting applications now" },
  { label: "Pending Applications", value: applications.filter((item) => item.status === "pending").length.toString(), hint: "Need review" },
  { label: "Unread Notifications", value: notifications.filter((item) => !item.is_read).length.toString(), hint: "Admin dashboard alerts" },
];
