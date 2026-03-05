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
