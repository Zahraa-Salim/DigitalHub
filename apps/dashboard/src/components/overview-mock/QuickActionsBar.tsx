import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Calendar,
  MessageSquare,
  UserPlus,
  FolderPlus,
  LayoutList,
  ExternalLink,
} from 'lucide-react';

type QuickActionsBarProps = {
  cohortId?: number | null;
};

export function QuickActionsBar({ cohortId = null }: QuickActionsBarProps) {
  const navigate = useNavigate();

  const toAdmissions = (params: Record<string, string>) => {
    const query = new URLSearchParams({ source: 'overview', ...params });
    if (cohortId && Number.isFinite(cohortId) && cohortId > 0) {
      query.set('cohort_id', String(cohortId));
    }
    navigate(`/admin/admissions?${query.toString()}`);
  };

  const toGeneralApply = (params: Record<string, string>) => {
    const query = new URLSearchParams({ source: 'overview', ...params });
    navigate(`/admin/general-apply?${query.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={() => toAdmissions({ stage: 'applied', focus: 'review_now' })}
      >
        <UserCheck className="w-4 h-4 mr-2" />
        Review Applications
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toAdmissions({ stage: 'reviewing', focus: 'schedule_interview' })}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Schedule Interview
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toGeneralApply({ tab: 'applications', stage: 'all', focus: 'messaging' })}
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Send Message
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toGeneralApply({ tab: 'applications', stage: 'participation_confirmed', focus: 'create_user' })}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Create User
      </Button>
      <div className="hidden xl:flex gap-2">
        <Button variant="ghost" size="sm" className="text-gray-600" onClick={() => navigate('/admin/cohorts')}>
          <FolderPlus className="w-4 h-4 mr-2" />
          Add Cohort
        </Button>
        <Button variant="ghost" size="sm" className="text-gray-600" onClick={() => navigate('/admin/programs')}>
          <LayoutList className="w-4 h-4 mr-2" />
          Add Program
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => toGeneralApply({ tab: 'applications', stage: 'all', focus: 'applied' })}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          General Apply
        </Button>
      </div>
    </div>
  );
}
