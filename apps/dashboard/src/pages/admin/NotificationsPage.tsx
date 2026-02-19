import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { notificationsMock } from "../../mock/adminUiData";
import { formatDateTime } from "../../utils/format";

export function NotificationsPage() {
  const [showRead, setShowRead] = useState(true);

  const rows = useMemo(() => {
    const sorted = [...notificationsMock].sort((a, b) => Number(a.isRead) - Number(b.isRead));
    if (showRead) {
      return sorted;
    }
    return sorted.filter((item) => !item.isRead);
  }, [showRead]);

  return (
    <PageShell title="Notifications" subtitle="Monitor admin notifications with unread items prioritized first.">
      <Card className="card--compact-row">
        <p className="info-text">{showRead ? "Showing all notifications" : "Showing unread notifications only"}</p>
        <button className="btn btn--secondary" type="button" onClick={() => setShowRead((current) => !current)}>
          {showRead ? "Hide Read" : "Show Read"}
        </button>
      </Card>

      {rows.length ? (
        <div className="list-stack">
          {rows.map((item) => (
            <Card key={item.id} className="notification-row">
              <div className="notification-row__head">
                <div>
                  <h3 className="section-title">{item.title}</h3>
                  <p className="list-row__meta">{formatDateTime(item.createdAt)}</p>
                </div>
                <Badge tone={item.isRead ? "default" : "new"}>{item.isRead ? "read" : "unread"}</Badge>
              </div>
              <p className="info-text">{item.body}</p>
              <div className="table-actions">
                <button className="btn btn--primary btn--sm" type="button" disabled title="API wiring next step">
                  Mark Read
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="empty-state">
            <p className="empty-state__title">No notifications</p>
            <p className="empty-state__description">Everything is caught up. New notifications will appear here.</p>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
