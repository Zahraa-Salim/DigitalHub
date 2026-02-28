import { Card } from './ui/Card';
import { Button } from './ui/Button';
import type { AdminOverviewData } from '../../lib/api';
import {
  Inbox,
  Clock,
  CalendarX,
  HelpCircle,
  UserX,
  UserMinus,
} from 'lucide-react';

type PipelineHealthPanelProps = {
  pipelineHealth: AdminOverviewData['pipelineHealth'];
  onAction?: (key: keyof AdminOverviewData['pipelineHealth']) => void;
};

export function PipelineHealthPanel({ pipelineHealth, onAction }: PipelineHealthPanelProps) {
  const bottlenecks = [
    {
      id: 1,
      key: 'newApplications' as const,
      label: 'New Applications',
      count: pipelineHealth.newApplications,
      action: 'Review Now',
      color: 'border-blue-500',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      icon: Inbox,
    },
    {
      id: 2,
      key: 'reviewingOver3Days' as const,
      label: 'Reviewing > 3 days',
      count: pipelineHealth.reviewingOver3Days,
      action: 'Follow Up',
      color: 'border-amber-500',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      icon: Clock,
    },
    {
      id: 3,
      key: 'invitedNoInterviewConfirm' as const,
      label: 'Invited, No Interview',
      count: pipelineHealth.invitedNoInterviewConfirm,
      action: 'Remind',
      color: 'border-amber-500',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      icon: CalendarX,
    },
    {
      id: 4,
      key: 'interviewDoneNoDecision' as const,
      label: 'Interviewed, No Decision',
      count: pipelineHealth.interviewDoneNoDecision,
      action: 'Decide',
      color: 'border-red-500',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      icon: HelpCircle,
    },
    {
      id: 5,
      key: 'acceptedNoParticipation' as const,
      label: 'Accepted, No Participation',
      count: pipelineHealth.acceptedNoParticipation,
      action: 'Follow Up',
      color: 'border-amber-500',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      icon: UserX,
    },
    {
      id: 6,
      key: 'confirmedNoUser' as const,
      label: 'Confirmed, No User',
      count: pipelineHealth.confirmedNoUser,
      action: 'Create User',
      color: 'border-red-500',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      icon: UserMinus,
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {bottlenecks.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.id}
            className={`border-l-4 ${item.color} overflow-hidden flex flex-col`}
          >
            <div className="p-4 flex-1">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {item.count}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-700 leading-tight h-10">
                {item.label}
              </h3>
            </div>
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 mt-auto">
              <Button
                variant="ghost"
                size="sm"
                className={`w-full text-xs font-semibold ${item.iconColor} hover:${item.bgColor}`}
                onClick={() => onAction?.(item.key)}
                disabled={item.count === 0}
              >
                {item.action} →
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
