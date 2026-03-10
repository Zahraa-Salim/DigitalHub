// File: frontend/src/dashboard/components/overview/ActivityFeedPanel.tsx
// Purpose: Renders the overview activity feed panel panel in the dashboard.
// It presents one focused slice of overview data, actions, or health signals.

import { Card } from "../Card";
import { formatDateTime } from "../../utils/format";
import type { AdminOverviewData } from "../../lib/api";

type ActivityFeedPanelProps = {
  items: AdminOverviewData["activityFeed"];
};

export function ActivityFeedPanel({ items }: ActivityFeedPanelProps) {
  return (
    <Card className="list-card overview-panel">
      <h3 className="section-title">Admin Activity Feed</h3>
      {items.length === 0 ? (
        <p className="info-text">No activity logged yet.</p>
      ) : (
        <div className="list-stack overview-metric-list">
          {items.map((item) => (
            <div className="list-row overview-feed-row" key={item.id}>
              <div>
                <p className="list-row__title">{item.text}</p>
                <p className="list-row__meta">{item.type}</p>
              </div>
              <div className="list-row__right">
                <p className="list-row__meta">{formatDateTime(item.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

