import { useNavigate } from "react-router-dom";

type QuickActionsBarProps = {
  cohortId?: number | null;
};

export function QuickActionsBar({ cohortId = null }: QuickActionsBarProps) {
  const navigate = useNavigate();

  const toAdmissions = (params: Record<string, string>) => {
    const query = new URLSearchParams({ source: "overview", ...params });
    if (cohortId && Number.isFinite(cohortId) && cohortId > 0) {
      query.set("cohort_id", String(cohortId));
    }
    navigate(`/admin/admissions?${query.toString()}`);
  };

  const toGeneralApply = (params: Record<string, string>) => {
    const query = new URLSearchParams({ source: "overview", ...params });
    navigate(`/admin/general-apply?${query.toString()}`);
  };

  return (
    <div className="table-actions overview-quick-actions">
      <button
        className="btn btn--secondary btn--sm overview-quick-actions__primary"
        type="button"
        onClick={() => toAdmissions({ stage: "applied", focus: "review_now" })}
      >
        Review Applications
      </button>
      <button
        className="btn btn--secondary btn--sm overview-quick-actions__primary"
        type="button"
        onClick={() => toAdmissions({ stage: "reviewing", focus: "schedule_interview" })}
      >
        Schedule Interview
      </button>
      <button
        className="btn btn--secondary btn--sm overview-quick-actions__primary"
        type="button"
        onClick={() => toGeneralApply({ tab: "applications", stage: "all", focus: "messaging" })}
      >
        Send Message
      </button>
      <button
        className="btn btn--secondary btn--sm overview-quick-actions__primary"
        type="button"
        onClick={() => toGeneralApply({ tab: "applications", stage: "participation_confirmed", focus: "create_user" })}
      >
        Create User
      </button>
      <button className="btn btn--ghost btn--sm overview-quick-actions__secondary" type="button" onClick={() => navigate("/admin/cohorts")}>
        Add Cohort
      </button>
      <button className="btn btn--ghost btn--sm overview-quick-actions__secondary" type="button" onClick={() => navigate("/admin/programs")}>
        Add Program
      </button>
      <button
        className="btn btn--ghost btn--sm overview-quick-actions__link"
        type="button"
        onClick={() => toGeneralApply({ tab: "applications", stage: "all", focus: "applied" })}
      >
        Open General Apply Pipeline
      </button>
    </div>
  );
}
