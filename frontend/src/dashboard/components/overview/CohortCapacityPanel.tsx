// File: frontend/src/dashboard/components/overview/CohortCapacityPanel.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { Card } from "../Card";
import type { AdminOverviewData } from "../../lib/api";

type CohortCapacityPanelProps = {
  items: AdminOverviewData["capacityAlerts"];
};

function percentage(enrolled: number, capacity: number): number {
  if (!capacity) return 0;
  return Math.round((enrolled / capacity) * 100);
}

export function CohortCapacityPanel({ items }: CohortCapacityPanelProps) {
  return (
    <Card className="overview-panel">
      <h3 className="section-title">Cohort Capacity Alerts</h3>
      {items.length === 0 ? (
        <p className="info-text">No cohorts above 80% capacity.</p>
      ) : (
        <div className="list-stack overview-metric-list">
          {items.map((item) => (
            <div className="list-row overview-metric-row" key={item.cohort_id}>
              <div>
                <p className="list-row__title">{item.cohort_name}</p>
                <p className="list-row__meta">
                  {item.enrolled} / {item.capacity} enrolled ({percentage(item.enrolled, item.capacity)}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
