import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QuickActionsBar } from './QuickActionsBar';
import { PipelineHealthPanel } from './PipelineHealthPanel';
import { InterviewOpsPanel } from './InterviewOpsPanel';
import { OnboardingGapPanel } from './OnboardingGapPanel';
import { MessagingHealthPanel } from './MessagingHealthPanel';
import { CohortConfigPanel } from './CohortConfigPanel';
import { GeneralApplyPanel } from './GeneralApplyPanel';
import { ActivityFeedPanel } from './ActivityFeedPanel';
import { CohortCapacityPanel } from './CohortCapacityPanel';
import { WeeklySnapshotPanel } from './WeeklySnapshotPanel';
import { SuperAdminPanel } from './SuperAdminPanel';
import { getAdminOverview, retryAdminOverviewFailedMessages, type AdminOverviewData } from '../../lib/api';
import { ApiError } from '../../utils/api';
import { getUser } from '../../utils/auth';

const LAST_ADMISSIONS_COHORT_KEY = 'dh:lastAdmissionsCohortId';

function toPositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function OverviewTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingChannel, setRetryingChannel] = useState<'email' | 'whatsapp' | null>(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminOverview();
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const role = (getUser().role || '').trim().toLowerCase();
  const isSuperAdmin = role === 'super admin' || role === 'super_admin';

  const weeklySnapshot = useMemo(() => {
    if (!data) {
      return {
        applicationsReceived: 0,
        interviewsCompleted: 0,
        usersCreated: 0,
        messagesSent: 0,
      };
    }
    return {
      applicationsReceived: data.pipelineHealth.newApplications,
      interviewsCompleted: data.pipelineHealth.interviewDoneNoDecision,
      usersCreated: data.onboardingGaps.userCreated,
      messagesSent: data.messagingHealth.email.sent + data.messagingHealth.whatsapp.sent,
    };
  }, [data]);

  const admissionsCohortId = useMemo(() => {
    const fromQuery = toPositiveInt(searchParams.get('cohort_id'));
    if (fromQuery) return fromQuery;

    const fromStorage = toPositiveInt(localStorage.getItem(LAST_ADMISSIONS_COHORT_KEY));
    if (fromStorage) return fromStorage;

    const fromCapacity = data?.capacityAlerts?.[0]?.cohort_id ?? null;
    if (fromCapacity && Number.isFinite(fromCapacity) && fromCapacity > 0) return fromCapacity;

    return null;
  }, [data, searchParams]);

  const handleRetry = async (channel: 'email' | 'whatsapp') => {
    setRetryingChannel(channel);
    setActionSuccess('');
    setActionError('');
    try {
      const result = await retryAdminOverviewFailedMessages({ channel, limit: 50 });
      await loadOverview();
      setActionSuccess(
        `Retry completed for ${channel}. Attempted: ${result.attempted}, sent: ${result.retried}, failed: ${result.failed}, skipped: ${result.skipped}.`,
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to retry messages.';
      setActionError(message);
    } finally {
      setRetryingChannel(null);
    }
  };

  const handlePipelineAction = (key: keyof AdminOverviewData['pipelineHealth']) => {
    const params = new URLSearchParams();
    params.set('source', 'overview');
    if (admissionsCohortId) {
      params.set('cohort_id', String(admissionsCohortId));
    }

    if (key === 'newApplications') {
      params.set('stage', 'applied');
      params.set('focus', 'review_now');
    } else if (key === 'reviewingOver3Days') {
      params.set('stage', 'reviewing');
      params.set('focus', 'reviewing_over_3_days');
    } else if (key === 'invitedNoInterviewConfirm') {
      params.set('stage', 'invited_to_interview');
      params.set('focus', 'pending_interview_confirmation');
    } else if (key === 'interviewDoneNoDecision') {
      params.set('stage', 'interview_confirmed');
      params.set('focus', 'decision_pending_after_interview');
    } else if (key === 'acceptedNoParticipation') {
      params.set('stage', 'accepted');
      params.set('focus', 'participation_pending');
    } else if (key === 'confirmedNoUser') {
      params.set('stage', 'participation_confirmed');
      params.set('focus', 'create_user');
    }

    navigate(`/admin/admissions?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 px-6 pb-20">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-gray-500">Loading overview...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6 px-6 pb-20">
        <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6 text-red-600">
          {error || 'Overview data unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Operations Command Center
          </h2>
          <p className="text-gray-500 mt-1">
            Monitor admissions pipeline and resolve operational bottlenecks.
          </p>
        </div>
        <QuickActionsBar cohortId={admissionsCohortId} />
      </div>
      {actionSuccess ? (
        <div className="bg-white rounded-lg border border-green-200 shadow-sm p-4 text-green-700">
          {actionSuccess}
        </div>
      ) : null}
      {actionError ? (
        <div className="bg-white rounded-lg border border-red-200 shadow-sm p-4 text-red-600">
          {actionError}
        </div>
      ) : null}

      <section>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
          Pipeline Health
        </h3>
        <PipelineHealthPanel
          pipelineHealth={data.pipelineHealth}
          onAction={handlePipelineAction}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <InterviewOpsPanel interviews={data.interviews} />
        </div>
        <div className="lg:col-span-5">
          <OnboardingGapPanel onboardingGaps={data.onboardingGaps} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MessagingHealthPanel
          messagingHealth={data.messagingHealth}
          onRetry={handleRetry}
          retryingChannel={retryingChannel}
        />
        <CohortConfigPanel cohortConfigIssues={data.cohortConfigIssues} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <GeneralApplyPanel
            generalApplySummary={data.generalApplySummary}
            conversion={data.conversion}
          />
        </div>
        <div className="lg:col-span-5">
          <ActivityFeedPanel activityFeed={data.activityFeed} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CohortCapacityPanel capacityAlerts={data.capacityAlerts} />
        <WeeklySnapshotPanel weeklySnapshot={weeklySnapshot} />
      </div>

      {isSuperAdmin && (
        <section className="mt-4">
          <SuperAdminPanel admins={data.superAdmin?.admins || []} />
        </section>
      )}
    </div>
  );
}
