// File: frontend/src/dashboard/pages/admin/profiles-shared/StatusPanel.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import type { ComponentProps } from "react";
import { Badge } from "../../../components/Badge";
import { Card } from "../../../components/Card";

type StatusBadge = {
  tone: ComponentProps<typeof Badge>["tone"];
  label: string;
};

type StatusPanelProps = {
  title: string;
  subtitle: string;
  badges: StatusBadge[];
};

export function StatusPanel({ title, subtitle, badges }: StatusPanelProps) {
  return (
    <Card className="instructors-hero">
      <div>
        <h3 className="section-title">{title}</h3>
        <p className="info-text">{subtitle}</p>
      </div>
      <div className="profile-badges">
        {badges.map((badge) => (
          <Badge key={`${badge.tone}-${badge.label}`} tone={badge.tone}>
            {badge.label}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
