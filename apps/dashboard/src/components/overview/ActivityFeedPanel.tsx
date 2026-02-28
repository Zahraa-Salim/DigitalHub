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
