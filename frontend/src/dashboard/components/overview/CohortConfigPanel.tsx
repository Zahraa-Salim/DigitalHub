import { useNavigate } from "react-router-dom";
import { Card } from "../Card";
import type { AdminOverviewData } from "../../lib/api";

type CohortConfigPanelProps = {
  issues: AdminOverviewData["cohortConfigIssues"];
};

export function CohortConfigPanel({ issues }: CohortConfigPanelProps) {
  const navigate = useNavigate();
  const firstIssue = issues[0] ?? null;

  const handleFix = () => {
    if (firstIssue?.cohort_id) {
      navigate(`/admin/forms?cohort_id=${firstIssue.cohort_id}`);
      return;
    }
    navigate("/admin/cohorts");
  };

  return (
    <Card className="overview-panel overview-panel--warning">
      <h3 className="section-title">Cohort Form Configuration</h3>
      {issues.length === 0 ? (
        <p className="info-text">No open cohort form issues detected.</p>
      ) : (
        <div className="list-stack overview-metric-list">
          {issues.map((issue) => (
            <div className="list-row overview-metric-row" key={`${issue.cohort_id}-${issue.issue}`}>
              <div>
                <p className="list-row__title">{issue.cohort_name}</p>
                <p className="list-row__meta">{issue.issue}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="table-actions">
        <button className="btn btn--primary btn--sm" type="button" onClick={handleFix}>
          Fix Configuration Now
        </button>
      </div>
    </Card>
  );
}
