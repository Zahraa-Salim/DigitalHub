import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import type { AdminOverviewData } from '../../lib/api';

type OnboardingGapPanelProps = {
  onboardingGaps: AdminOverviewData['onboardingGaps'];
};

export function OnboardingGapPanel({ onboardingGaps }: OnboardingGapPanelProps) {
  const acceptedBase = onboardingGaps.accepted > 0 ? onboardingGaps.accepted : 1;
  const steps = [
    {
      label: 'Accepted',
      count: onboardingGaps.accepted,
      total: onboardingGaps.accepted,
      color: 'bg-blue-500',
    },
    {
      label: 'Participation Confirmed',
      count: onboardingGaps.participationConfirmed,
      total: onboardingGaps.accepted,
      color: 'bg-indigo-500',
    },
    {
      label: 'User Created',
      count: onboardingGaps.userCreated,
      total: onboardingGaps.participationConfirmed > 0 ? onboardingGaps.participationConfirmed : 1,
      color: 'bg-purple-500',
    },
    {
      label: 'Enrollment Created',
      count: onboardingGaps.enrollmentCreated,
      total: onboardingGaps.userCreated > 0 ? onboardingGaps.userCreated : 1,
      color: 'bg-green-500',
    },
  ];
  return (
    <Card className="h-full">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle>Onboarding Gaps</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {steps.map((step, index) => {
            const percentage =
              index === 0
                ? 100
                : Math.round((step.count / acceptedBase) * 100);
            const conversionRate =
              index === 0 ? null : Math.round((step.count / step.total) * 100);
            return (
              <div key={step.label} className="relative">
                {index > 0 && (
                  <div className="absolute -top-5 left-2 text-[10px] font-bold text-gray-400 flex items-center">
                    <div className="h-4 w-px bg-gray-300 mr-2"></div>
                    {conversionRate}% conversion
                  </div>
                )}
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">
                    {step.label}
                  </span>
                  <span className="font-bold text-gray-900">{step.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`${step.color} h-2.5 rounded-full transition-all duration-500`}
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
