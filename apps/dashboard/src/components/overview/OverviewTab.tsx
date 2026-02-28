import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAdminOverview, type AdminOverviewData } from "../../lib/api";
import { ApiError } from "../../utils/api";
import { getUser } from "../../utils/auth";
import { Card } from "../Card";
import { ActivityFeedPanel } from "./ActivityFeedPanel";
import { CohortCapacityPanel } from "./CohortCapacityPanel";
import { CohortConfigPanel } from "./CohortConfigPanel";
import { GeneralApplyPanel } from "./GeneralApplyPanel";
import { InterviewOpsPanel } from "./InterviewOpsPanel";
import { MessagingHealthPanel } from "./MessagingHealthPanel";
import { OnboardingGapPanel } from "./OnboardingGapPanel";
import { PipelineHealthPanel } from "./PipelineHealthPanel";
import { QuickActionsBar } from "./QuickActionsBar";
import { SuperAdminPanel } from "./SuperAdminPanel";
import { WeeklySnapshotPanel } from "./WeeklySnapshotPanel";

const LAST_ADMISSIONS_COHORT_KEY = "dh:lastAdmissionsCohortId";

function toPositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

type OverviewTabState = {
  loading: boolean;
  error: string;
  data: AdminOverviewData | null;
};

const initialState: OverviewTabState = {
  loading: true,
  error: "",
  data: null,
};

export function OverviewTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<OverviewTabState>(initialState);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await getAdminOverview();
      setState({ loading: false, error: "", data });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to load overview data.";
      setState({ loading: false, error: message, data: null });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currentUser = getUser();
  const role = (currentUser.role || currentUser.admin_role || "").trim().toLowerCase();
  const isSuperAdmin = role === "super admin" || role === "super_admin";

  const weeklySnapshot = useMemo(() => {
    if (!state.data) {
      return {
        applicationsReceived: 0,
        interviewsCompleted: 0,
        usersCreated: 0,
        messagesSent: 0,
      };
    }
    return {
      applicationsReceived: state.data.pipelineHealth.newApplications,
      interviewsCompleted: state.data.pipelineHealth.interviewDoneNoDecision,
      usersCreated: state.data.onboardingGaps.userCreated,
      messagesSent: state.data.messagingHealth.email.sent + state.data.messagingHealth.whatsapp.sent,
    };
  }, [state.data]);

  const admissionsCohortId = useMemo(() => {
    const fromQuery = toPositiveInt(searchParams.get("cohort_id"));
    if (fromQuery) return fromQuery;

    const fromStorage = toPositiveInt(localStorage.getItem(LAST_ADMISSIONS_COHORT_KEY));
    if (fromStorage) return fromStorage;

    const fromCapacity = state.data?.capacityAlerts?.[0]?.cohort_id ?? null;
    if (fromCapacity && Number.isFinite(fromCapacity) && fromCapacity > 0) return fromCapacity;

    return null;
  }, [searchParams, state.data]);

  const onPipelineAction = useCallback(
    (key: keyof AdminOverviewData["pipelineHealth"]) => {
      const params = new URLSearchParams();
      params.set("source", "overview");
      if (admissionsCohortId) {
        params.set("cohort_id", String(admissionsCohortId));
      }

      if (key === "newApplications") {
        params.set("stage", "applied");
        params.set("focus", "review_now");
      } else if (key === "reviewingOver3Days") {
        params.set("stage", "reviewing");
        params.set("focus", "reviewing_over_3_days");
      } else if (key === "invitedNoInterviewConfirm") {
        params.set("stage", "invited_to_interview");
        params.set("focus", "pending_interview_confirmation");
      } else if (key === "interviewDoneNoDecision") {
        params.set("stage", "interview_confirmed");
        params.set("focus", "decision_pending_after_interview");
      } else if (key === "acceptedNoParticipation") {
        params.set("stage", "accepted");
        params.set("focus", "participation_pending");
      } else if (key === "confirmedNoUser") {
        params.set("stage", "participation_confirmed");
        params.set("focus", "create_user");
      }

      navigate(`/admin/admissions?${params.toString()}`);
    },
    [admissionsCohortId, navigate],
  );

  const onMessagingRetry = useCallback(
    (_channel: "email" | "whatsapp") => {
      navigate("/admin/message-templates");
    },
    [navigate],
  );

  if (state.loading) {
    return (
      <Card className="overview-state-card">
        <div className="spinner">Loading overview data...</div>
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="overview-state-card">
        <p className="alert alert--error">{state.error}</p>
        <div className="table-actions overview-state-actions">
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => void load()}>
            Retry
          </button>
        </div>
      </Card>
    );
  }

  if (!state.data) {
    return null;
  }

  return (
    <div className="dh-page overview-tab">
      <section className="overview-header">
        <div>
          <h2 className="overview-header__title">Operations Command Center</h2>
          <p className="overview-header__subtitle">Monitor admissions pipeline and resolve operational bottlenecks.</p>
        </div>
        <QuickActionsBar cohortId={admissionsCohortId} />
      </section>

      <section className="overview-section">
        <h3 className="section-title overview-section__title">Pipeline Health</h3>
        <PipelineHealthPanel data={state.data.pipelineHealth} onAction={onPipelineAction} />
      </section>

      <div className="two-col-grid two-col-grid--uneven overview-grid">
        <InterviewOpsPanel data={state.data.interviews} />
        <OnboardingGapPanel data={state.data.onboardingGaps} />
      </div>

      <div className="two-col-grid overview-grid">
        <MessagingHealthPanel data={state.data.messagingHealth} onRetry={onMessagingRetry} />
        <CohortConfigPanel issues={state.data.cohortConfigIssues} />
      </div>

      <div className="two-col-grid two-col-grid--uneven overview-grid">
        <GeneralApplyPanel summary={state.data.generalApplySummary} conversion={state.data.conversion} />
        <ActivityFeedPanel items={state.data.activityFeed} />
      </div>

      <div className="two-col-grid overview-grid">
        <CohortCapacityPanel items={state.data.capacityAlerts} />
        <WeeklySnapshotPanel values={weeklySnapshot} />
      </div>

      {isSuperAdmin && state.data.superAdmin ? (
        <section className="overview-section">
          <SuperAdminPanel admins={state.data.superAdmin.admins} />
        </section>
      ) : null}
    </div>
  );
}
