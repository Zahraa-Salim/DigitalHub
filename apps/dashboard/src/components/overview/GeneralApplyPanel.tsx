import { Card } from "../Card";
import type { AdminOverviewData } from "../../lib/api";

type GeneralApplyPanelProps = {
  summary: AdminOverviewData["generalApplySummary"];
  conversion: AdminOverviewData["conversion"];
};

const stageLabels: Array<{ key: keyof AdminOverviewData["generalApplySummary"]; label: string }> = [
  { key: "applied", label: "Applied" },
  { key: "reviewing", label: "Reviewing" },
  { key: "invited_to_interview", label: "Invited" },
  { key: "interview_confirmed", label: "Interview Confirmed" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "participation_confirmed", label: "Confirmed" },
];

export function GeneralApplyPanel({ summary, conversion }: GeneralApplyPanelProps) {
  return (
    <Card className="overview-panel">
      <h3 className="section-title">General Apply Summary</h3>
      <div className="stats-grid stats-grid--compact overview-summary-grid">
        {stageLabels.map((stage) => (
          <div key={stage.key} className="overview-summary-item">
            <p className="stats-card__label">{stage.label}</p>
            <p className="stats-card__value">{summary[stage.key]}</p>
          </div>
        ))}
      </div>
      <h4 className="section-title overview-subtitle">Conversion Progression</h4>
      <div className="list-stack overview-metric-list">
        <div className="list-row overview-metric-row">
          <p className="list-row__title">General Applicants</p>
          <p className="list-row__title">{conversion.generalApplicants}</p>
        </div>
        <div className="list-row overview-metric-row">
          <p className="list-row__title">Converted to Cohort</p>
          <p className="list-row__title">{conversion.convertedToCohort}</p>
        </div>
        <div className="list-row overview-metric-row">
          <p className="list-row__title">Converted to Platform User</p>
          <p className="list-row__title">{conversion.convertedToUser}</p>
        </div>
      </div>
    </Card>
  );
}
