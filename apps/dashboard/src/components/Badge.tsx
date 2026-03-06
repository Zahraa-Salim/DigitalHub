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
