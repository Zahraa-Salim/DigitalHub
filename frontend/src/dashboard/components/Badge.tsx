// File: frontend/src/dashboard/components/Badge.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { cn } from "../utils/cn";

type BadgeTone =
  | "planned"
  | "open"
  | "running"
  | "completed"
  | "cancelled"
  | "pending"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "coming_soon"
  | "published"
  | "unpublished"
  | "public"
  | "private"
  | "new"
  | "resolved"
  | "in_progress"
  | "done"
  | "draft"
  | "default";

type BadgeProps = {
  children: string;
  tone?: BadgeTone;
};

export function Badge({ children, tone = "default" }: BadgeProps) {
  return <span className={cn("status-badge", `status-badge--${tone}`)}>{children}</span>;
}
