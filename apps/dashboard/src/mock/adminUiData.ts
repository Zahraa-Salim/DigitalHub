export type AppStatus = "pending" | "approved" | "rejected";
export type CohortStatus = "planned" | "open" | "running" | "completed" | "cancelled";
export type PublishStatus = "published" | "draft";
export type VisibilityStatus = "public" | "private";
export type ContactStatus = "new" | "in_progress" | "resolved";

export const applicationsMock = [
  { id: 1201, name: "Lina Saad", email: "lina@example.com", cohort: "FS Spring 2026", status: "pending" as AppStatus, submittedAt: "2026-02-18T09:14:00Z" },
  { id: 1202, name: "Omar Adel", email: "omar@example.com", cohort: "UI/UX Spring 2026", status: "approved" as AppStatus, submittedAt: "2026-02-17T12:02:00Z" },
  { id: 1203, name: "Noor Ali", email: "noor@example.com", cohort: "FS Spring 2026", status: "pending" as AppStatus, submittedAt: "2026-02-19T06:38:00Z" },
  { id: 1204, name: "Sara Hani", email: "sara@example.com", cohort: "Data Summer 2026", status: "rejected" as AppStatus, submittedAt: "2026-02-15T14:20:00Z" },
  { id: 1205, name: "Youssef Karim", email: "youssef@example.com", cohort: "FS Spring 2026", status: "approved" as AppStatus, submittedAt: "2026-02-16T08:41:00Z" },
];

export const cohortsMock = [
  { id: 301, name: "FS Spring 2026", program: "Full Stack Development", status: "open" as CohortStatus, capacity: 24, startDate: "2026-03-05" },
  { id: 302, name: "UI/UX Spring 2026", program: "UI/UX Design", status: "running" as CohortStatus, capacity: 18, startDate: "2026-01-18" },
  { id: 303, name: "Data Winter 2025", program: "Data Analytics", status: "completed" as CohortStatus, capacity: 20, startDate: "2025-10-02" },
  { id: 304, name: "Cloud Summer 2026", program: "Cloud Foundations", status: "planned" as CohortStatus, capacity: 16, startDate: "2026-06-01" },
  { id: 305, name: "Cyber Spring 2026", program: "Cybersecurity Basics", status: "cancelled" as CohortStatus, capacity: 14, startDate: "2026-04-10" },
];

export const programsMock = [
  { id: 21, title: "Full Stack Development", updatedAt: "2026-02-18T11:20:00Z", isPublished: true },
  { id: 22, title: "UI/UX Design", updatedAt: "2026-02-15T09:00:00Z", isPublished: true },
  { id: 23, title: "Data Analytics", updatedAt: "2026-02-10T15:48:00Z", isPublished: false },
  { id: 24, title: "Cloud Foundations", updatedAt: "2026-02-08T13:10:00Z", isPublished: false },
];

export const cmsPagesMock = [
  { id: 1, key: "about", title: "About", isPublished: true, updatedAt: "2026-02-16T12:25:00Z", content: "About page content preview text." },
  { id: 2, key: "contact", title: "Contact", isPublished: true, updatedAt: "2026-02-11T08:05:00Z", content: "Contact page content preview text." },
  { id: 3, key: "faq", title: "FAQ", isPublished: false, updatedAt: "2026-02-09T16:30:00Z", content: "FAQ draft content preview text." },
];

export const homeSectionsMock = [
  { id: 11, key: "hero", title: "Hero Banner", sortOrder: 1, enabled: true },
  { id: 12, key: "featured_programs", title: "Featured Programs", sortOrder: 2, enabled: true },
  { id: 13, key: "student_stories", title: "Student Stories", sortOrder: 3, enabled: false },
  { id: 14, key: "events", title: "Upcoming Events", sortOrder: 4, enabled: true },
];

export const themeTokensMock = [
  { id: 1, key: "--primary", purpose: "Primary buttons and links", value: "#1e293b", scope: "global" },
  { id: 2, key: "--surface", purpose: "Card backgrounds", value: "#ffffff", scope: "dashboard" },
  { id: 3, key: "--accent", purpose: "Highlights and labels", value: "#0ea5e9", scope: "website" },
];

export const announcementsMock = [
  { id: 71, title: "Internship Week Opens", audience: "students", status: "published" as PublishStatus, publishDate: "2026-02-20" },
  { id: 72, title: "Instructor Orientation", audience: "instructors", status: "draft" as PublishStatus, publishDate: "2026-02-25" },
  { id: 73, title: "Platform Maintenance", audience: "all", status: "published" as PublishStatus, publishDate: "2026-02-22" },
];

export const eventsMock = [
  { id: 81, title: "Career Fair", date: "2026-03-12", location: "Main Hall", isPublished: true, isDone: false },
  { id: 82, title: "UX Portfolio Review", date: "2026-02-01", location: "Lab B", isPublished: true, isDone: true },
  { id: 83, title: "Cloud Workshop", date: "2026-04-05", location: "Tech Center", isPublished: false, isDone: false },
];

export const studentsMock = [
  { id: 401, name: "Mariam Nasser", track: "Full Stack", featured: true, isPublic: true as boolean },
  { id: 402, name: "Ali Tarek", track: "Data Analytics", featured: false, isPublic: true as boolean },
  { id: 403, name: "Salma Ahmed", track: "UI/UX", featured: false, isPublic: false as boolean },
];

export const instructorsMock = [
  { id: 501, name: "Hossam Adel", expertise: "Node.js", isPublic: true },
  { id: 502, name: "Rana Samir", expertise: "UX Research", isPublic: true },
  { id: 503, name: "Mostafa Saleh", expertise: "Cloud Architecture", isPublic: false },
];

export const managersMock = [
  { id: 601, name: "Alaa Hassan", jobTitle: "Program Manager", sortOrder: 1, isPublic: true },
  { id: 602, name: "Nouran Fathy", jobTitle: "Operations Lead", sortOrder: 2, isPublic: true },
  { id: 603, name: "Karim Wael", jobTitle: "Partnership Manager", sortOrder: 3, isPublic: false },
];

export const contactMessagesMock = [
  { id: 901, name: "Ranya M.", email: "ranya@example.com", kind: "question", status: "new" as ContactStatus, createdAt: "2026-02-19T07:20:00Z" },
  { id: 902, name: "TechNova HR", email: "jobs@technova.com", kind: "visit_request", status: "in_progress" as ContactStatus, createdAt: "2026-02-18T12:45:00Z" },
  { id: 903, name: "Ahmed M.", email: "ahmed@example.com", kind: "feedback", status: "resolved" as ContactStatus, createdAt: "2026-02-15T09:11:00Z" },
];

export const notificationsMock = [
  { id: 1001, title: "New Application", body: "A new application was submitted for FS Spring 2026.", isRead: false, createdAt: "2026-02-19T08:01:00Z" },
  { id: 1002, title: "Theme Token Updated", body: "Token --primary was updated.", isRead: true, createdAt: "2026-02-19T05:32:00Z" },
  { id: 1003, title: "Announcement Published", body: "Internship Week Opens was published.", isRead: false, createdAt: "2026-02-18T16:10:00Z" },
];

export const logsMock = [
  {
    id: 2001,
    time: "2026-02-19T08:00:00Z",
    action: "approve_application",
    entityType: "applications",
    message: "Application #1202 approved and enrollment created.",
    metadata: { application_id: 1202, actor_user_id: 1 },
  },
  {
    id: 2002,
    time: "2026-02-18T14:22:00Z",
    action: "edit_theme",
    entityType: "theme_tokens",
    message: "Updated token --primary from #111827 to #1e293b.",
    metadata: { token: "--primary", previous: "#111827", next: "#1e293b" },
  },
  {
    id: 2003,
    time: "2026-02-18T10:15:00Z",
    action: "create_event",
    entityType: "events",
    message: "Created event Career Fair.",
    metadata: { event_title: "Career Fair", publish: true },
  },
];

export const profileMock = {
  name: "Digital Hub Admin",
  email: "admin@digitalhub.com",
  role: "super_admin",
  department: "Operations",
  timezone: "UTC+02:00",
};
