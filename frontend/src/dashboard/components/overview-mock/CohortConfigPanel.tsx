import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Settings } from 'lucide-react';
import type { AdminOverviewData } from '../../lib/api';

type CohortConfigPanelProps = {
  cohortConfigIssues: AdminOverviewData['cohortConfigIssues'];
};

export function CohortConfigPanel({ cohortConfigIssues }: CohortConfigPanelProps) {
  const navigate = useNavigate();
  const issue = cohortConfigIssues[0] || null;

  const handleFix = () => {
    if (issue?.cohort_id) {
      navigate(`/admin/forms?cohort_id=${issue.cohort_id}`);
      return;
    }
    navigate('/admin/cohorts');
  };

  return (
    <Card className="h-full border-amber-200 bg-amber-50/30">
      <CardContent className="p-6 flex flex-col h-full justify-center">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-amber-900 mb-1">
              {issue ? 'Configuration Issues Detected' : 'Configuration Healthy'}
            </h3>
            <p className="text-sm text-amber-700 mb-4">
              {issue ? (
                <>
                  <span className="font-semibold text-amber-900">
                    {issue.cohort_name}
                  </span>{' '}
                  has{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded text-xs">
                    allow_applications = TRUE
                  </code>{' '}
                  but no application form is assigned.
                </>
              ) : (
                'All cohorts with applications enabled have valid form assignments.'
              )}
            </p>
            <p className="text-xs text-amber-600 mb-4 font-medium uppercase tracking-wider">
              {issue ? 'Cohorts open but no application form assigned' : 'No issues detected'}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white border-none"
              onClick={handleFix}
            >
              <Settings className="w-4 h-4 mr-2" />
              {issue ? 'Fix Configuration Now' : 'Open Cohorts'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
