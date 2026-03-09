import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { ArrowRight } from 'lucide-react';
import type { AdminOverviewData } from '../../lib/api';

type GeneralApplyPanelProps = {
  generalApplySummary: AdminOverviewData['generalApplySummary'];
  conversion: AdminOverviewData['conversion'];
};

export function GeneralApplyPanel({
  generalApplySummary,
  conversion,
}: GeneralApplyPanelProps) {
  const pipeline = [
    {
      label: 'Applied',
      count: generalApplySummary.applied,
    },
    {
      label: 'Reviewing',
      count: generalApplySummary.reviewing,
    },
    {
      label: 'Invited',
      count: generalApplySummary.invited_to_interview,
    },
    {
      label: 'Interview Confirmed',
      count: generalApplySummary.interview_confirmed,
    },
    {
      label: 'Accepted',
      count: generalApplySummary.accepted,
    },
    {
      label: 'Rejected',
      count: generalApplySummary.rejected,
    },
    {
      label: 'Confirmed',
      count: generalApplySummary.participation_confirmed,
    },
  ];
  return (
    <Card className="h-full">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle>General Apply Summary (Program Pipeline)</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 md:grid-cols-7 gap-4 mb-8">
          {pipeline.map((stage) => (
            <div key={stage.label} className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stage.count}
              </div>
              <div className="text-xs font-medium text-gray-500 uppercase mt-1">
                {stage.label}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            Conversion Progression
          </h4>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 text-center p-3 bg-white rounded shadow-sm border border-gray-100 w-full">
              <div className="text-sm text-gray-500 mb-1">
                General Applicants
              </div>
              <div className="text-xl font-bold text-gray-900">{conversion.generalApplicants}</div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 hidden sm:block" />
            <div className="flex-1 text-center p-3 bg-white rounded shadow-sm border border-blue-100 w-full">
              <div className="text-sm text-blue-600 mb-1">
                Converted to Cohort
              </div>
              <div className="text-xl font-bold text-blue-700">{conversion.convertedToCohort}</div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 hidden sm:block" />
            <div className="flex-1 text-center p-3 bg-white rounded shadow-sm border border-green-100 w-full">
              <div className="text-sm text-green-600 mb-1">
                Converted to Platform User
              </div>
              <div className="text-xl font-bold text-green-700">{conversion.convertedToUser}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
