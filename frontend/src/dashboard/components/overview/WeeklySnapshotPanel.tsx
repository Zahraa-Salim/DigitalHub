// File: frontend/src/dashboard/components/overview-mock/WeeklySnapshotPanel.tsx
// Purpose: Renders the mock overview weekly snapshot panel panel for the dashboard.
// It exists to prototype overview layouts and states without live data wiring.

import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

type WeeklySnapshotPanelProps = {
  weeklySnapshot: {
    applicationsReceived: number;
    interviewsCompleted: number;
    usersCreated: number;
    messagesSent: number;
  };
};

export function WeeklySnapshotPanel({ weeklySnapshot }: WeeklySnapshotPanelProps) {
  const stats = [
    {
      label: 'Applications Received',
      value: String(weeklySnapshot.applicationsReceived),
      trend: '+0%',
    },
    {
      label: 'Interviews Completed',
      value: String(weeklySnapshot.interviewsCompleted),
      trend: '+0%',
    },
    {
      label: 'Users Created',
      value: String(weeklySnapshot.usersCreated),
      trend: '+0%',
    },
    {
      label: 'Messages Sent',
      value: String(weeklySnapshot.messagesSent),
      trend: '+0%',
    },
  ];
  return (
    <Card className="h-full">
      <CardHeader style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
        <CardTitle>
          Weekly Operations Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            const cardStyles = [
              { background: "var(--accent-soft)", borderColor: "var(--accent-soft)" },
              { background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)" },
              { background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.2)" },
              { background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)" },
            ];
            return (
            <div
              key={stat.label}
              style={{ padding: "16px", borderRadius: "8px", border: "1px solid", ...cardStyles[index] }}
            >
              <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                {stat.label}
              </div>
              <div className="flex items-end gap-2">
                <span style={{ fontSize: "30px", fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 500, marginBottom: "4px", color: stat.trend.startsWith('+') ? "var(--success, #15803d)" : "var(--danger)" }}>
                  {stat.trend}
                </span>
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

