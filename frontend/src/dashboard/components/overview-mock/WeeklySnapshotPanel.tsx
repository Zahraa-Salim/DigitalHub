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
    <Card className="h-full bg-gray-900 text-white border-none">
      <CardHeader className="border-b border-gray-800 pb-4">
        <CardTitle className="text-gray-100">
          Weekly Operations Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="p-4 bg-gray-800 rounded-lg">
              <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
                {stat.label}
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white leading-none">
                  {stat.value}
                </span>
                <span
                  className={`text-xs font-medium mb-1 ${stat.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}
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
