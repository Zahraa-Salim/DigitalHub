import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Calendar, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import type { AdminOverviewData } from '../../lib/api';

type InterviewOpsPanelProps = {
  interviews: AdminOverviewData['interviews'];
};

export function InterviewOpsPanel({ interviews }: InterviewOpsPanelProps) {
  const confirmRate = Math.round(interviews.confirmRate || 0);
  return (
    <Card className="h-full">
      <CardHeader className="border-b border-gray-100 pb-4">
        <div className="flex justify-between items-center">
          <CardTitle>Interview Operations</CardTitle>
          <div className="text-sm font-medium text-gray-500">
            <span className="text-green-600 font-bold">{confirmRate}%</span> Confirmed vs
            Invited
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Today's Interviews
              </p>
              <p className="text-2xl font-bold text-gray-900">{interviews.today}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Upcoming</p>
              <p className="text-2xl font-bold text-gray-900">{interviews.upcoming}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Pending Confirmations
              </p>
              <p className="text-2xl font-bold text-gray-900">{interviews.pendingConfirmations}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Reschedule Requests
              </p>
              <p className="text-2xl font-bold text-gray-900">{interviews.rescheduleRequests}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
