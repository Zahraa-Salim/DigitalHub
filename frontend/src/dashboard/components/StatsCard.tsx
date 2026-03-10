// File: frontend/src/dashboard/components/StatsCard.tsx
// Purpose: Renders the dashboard stats card component.
// It packages reusable admin UI and behavior for dashboard pages.

import { Card } from "./Card";

type StatsCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function StatsCard({ label, value, hint }: StatsCardProps) {
  return (
    <Card className="stats-card">
      <p className="stats-card__label">{label}</p>
      <p className="stats-card__value">{value}</p>
      <p className="stats-card__hint">{hint}</p>
    </Card>
  );
}

