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
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle>
          Weekly Operations Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`p-4 rounded-lg border ${
                index === 0
                  ? "bg-blue-50 border-blue-100"
                  : index === 1
                    ? "bg-amber-50 border-amber-200"
                    : index === 2
                      ? "bg-purple-50 border-purple-200"
                      : "bg-green-50 border-green-200"
              }`}
            >
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
                {stat.label}
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900 leading-none">
                  {stat.value}
                </span>
                <span
                  className={`text-xs font-medium mb-1 ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}
                >
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

