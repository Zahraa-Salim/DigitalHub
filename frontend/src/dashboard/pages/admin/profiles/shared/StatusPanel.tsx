// File: frontend/src/dashboard/pages/admin/profiles-shared/StatusPanel.tsx
// Purpose: Renders the admin status panel page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import type { ComponentProps } from "react";
import { Badge } from "../../../../components/Badge";
import { Card } from "../../../../components/Card";

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
    <Card className="instructors-hero profile-hub-panel">
      <div className="profile-hub-panel__content">
        <h3 className="section-title">{title}</h3>
        <p className="info-text">{subtitle}</p>
      </div>
      <div className="profile-badges profile-hub-panel__badges">
        {badges.map((badge) => (
          <Badge key={`${badge.tone}-${badge.label}`} tone={badge.tone}>
            {badge.label}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

