import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import type { AdminOverviewData } from '../../lib/api';

type CohortCapacityPanelProps = {
  capacityAlerts: AdminOverviewData['capacityAlerts'];
};

export function CohortCapacityPanel({ capacityAlerts }: CohortCapacityPanelProps) {
  const cohorts = capacityAlerts.map((item) => ({
    name: item.cohort_name,
    enrolled: item.enrolled,
    capacity: item.capacity,
  }));
  return (
    <Card className="h-full">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle>Cohort Capacity Alerts</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-5">
          {cohorts.length === 0 ? (
            <p className="text-sm text-gray-500">No capacity alerts right now.</p>
          ) : cohorts.map((cohort) => {
            const percentage = Math.round(
              (cohort.enrolled / cohort.capacity) * 100,
            );
            let barColor = 'bg-blue-500';
            let badge = null;
            if (percentage >= 90) {
              barColor = 'bg-red-500';
              badge = (
                <Badge variant="red" className="ml-2">
                  90%+ Full
                </Badge>
              );
            } else if (percentage >= 80) {
              barColor = 'bg-amber-500';
              badge = (
                <Badge variant="yellow" className="ml-2">
                  80%+ Full
                </Badge>
              );
            }
            return (
              <div key={cohort.name}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {cohort.name}
                    </span>
                    {badge}
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                    {cohort.enrolled}{' '}
                    <span className="text-gray-400 font-normal">
                      / {cohort.capacity}
                    </span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`${barColor} h-2 rounded-full`}
                    style={{
                      width: `${percentage}%`,
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
