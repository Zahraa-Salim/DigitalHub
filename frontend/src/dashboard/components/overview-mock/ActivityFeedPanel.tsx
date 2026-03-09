import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { useMemo, useState } from 'react';
import type { AdminOverviewData } from '../../lib/api';
import {
  CheckCircle2,
  Calendar,
  UserCheck,
  UserPlus,
  Send,
  AlertCircle,
} from 'lucide-react';

type ActivityFeedPanelProps = {
  activityFeed: AdminOverviewData['activityFeed'];
};

type ActivityFilter = 'all' | 'admissions' | 'messaging' | 'onboarding' | 'interviews';

function formatRelativeTime(isoValue: string): string {
  const date = new Date(isoValue);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return 'just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function iconForType(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('message')) return { icon: Send, color: 'text-gray-500' };
  if (normalized.includes('interview')) return { icon: Calendar, color: 'text-blue-500' };
  if (normalized.includes('accept')) return { icon: CheckCircle2, color: 'text-green-500' };
  if (normalized.includes('confirm')) return { icon: UserCheck, color: 'text-indigo-500' };
  if (normalized.includes('user')) return { icon: UserPlus, color: 'text-purple-500' };
  if (normalized.includes('fail') || normalized.includes('error')) return { icon: AlertCircle, color: 'text-red-500' };
  return { icon: CheckCircle2, color: 'text-green-500' };
}

export function ActivityFeedPanel({ activityFeed }: ActivityFeedPanelProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const activities = activityFeed.map((activity) => ({
    ...activity,
    time: formatRelativeTime(activity.created_at),
    ...iconForType(activity.type),
  }));
  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter((activity) => {
      const normalized = `${activity.type} ${activity.text}`.toLowerCase();
      if (filter === 'admissions') return normalized.includes('admission') || normalized.includes('application');
      if (filter === 'messaging') return normalized.includes('message') || normalized.includes('email') || normalized.includes('sms') || normalized.includes('whatsapp');
      if (filter === 'onboarding') return normalized.includes('user') || normalized.includes('onboarding') || normalized.includes('participation') || normalized.includes('enrollment');
      if (filter === 'interviews') return normalized.includes('interview');
      return true;
    });
  }, [activities, filter]);

  const filterOrder: ActivityFilter[] = ['all', 'admissions', 'messaging', 'onboarding', 'interviews'];
  const nextFilter = () => {
    const currentIndex = filterOrder.indexOf(filter);
    const nextIndex = (currentIndex + 1) % filterOrder.length;
    setFilter(filterOrder[nextIndex]);
  };

  const filterLabel =
    filter === 'all'
      ? 'All'
      : filter === 'admissions'
        ? 'Admissions'
        : filter === 'messaging'
          ? 'Messaging'
          : filter === 'onboarding'
            ? 'Onboarding'
            : 'Interviews';
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b border-gray-100 pb-4 flex flex-row items-center justify-between">
        <CardTitle>Admin Activity</CardTitle>
        <Badge variant="gray" className="cursor-pointer hover:bg-gray-200" onClick={nextFilter}>
          Filter: {filterLabel}
        </Badge>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="h-[300px] overflow-y-auto p-4 space-y-4">
          {filteredActivities.length === 0 ? (
            <div className="text-sm text-gray-500">No recent activity.</div>
          ) : filteredActivities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-0.5">
                  <Icon className={`w-4 h-4 ${activity.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-800">{activity.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activity.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
