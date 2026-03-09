// File: frontend/src/dashboard/components/StatsCard.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
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
