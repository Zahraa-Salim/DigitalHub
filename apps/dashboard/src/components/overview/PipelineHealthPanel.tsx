import { Card } from "../Card";
import type { AdminOverviewData } from "../../lib/api";

type PipelineHealthPanelProps = {
  data: AdminOverviewData["pipelineHealth"];
  onAction: (key: keyof AdminOverviewData["pipelineHealth"]) => void;
};

export function PipelineHealthPanel({ data, onAction }: PipelineHealthPanelProps) {
  const items: Array<{
    key: keyof AdminOverviewData["pipelineHealth"];
    label: string;
    count: number;
    cta: string;
  }> = [
    { key: "newApplications", label: "Applied", count: data.newApplications, cta: "Review Now" },
    { key: "reviewingOver3Days", label: "Reviewing > 3 days", count: data.reviewingOver3Days, cta: "Open" },
    {
      key: "invitedNoInterviewConfirm",
      label: "Invited but not confirmed",
      count: data.invitedNoInterviewConfirm,
      cta: "Resend Invite",
    },
    {
      key: "interviewDoneNoDecision",
      label: "Interview Done, No Decision",
      count: data.interviewDoneNoDecision,
      cta: "Decide",
    },
    {
      key: "acceptedNoParticipation",
      label: "Accepted, Participation Pending",
      count: data.acceptedNoParticipation,
      cta: "Follow Up",
    },
    { key: "confirmedNoUser", label: "Participation Confirmed, No User", count: data.confirmedNoUser, cta: "Create User" },
  ];

  return (
    <div className="overview-pipeline-grid">
      {items.map((item) => (
        <Card key={item.key} className="overview-pipeline-card">
          <div className="overview-pipeline-card__body">
            <p className="overview-pipeline-card__count">{item.count}</p>
            <p className="overview-pipeline-card__label">{item.label}</p>
          </div>
          <div className="overview-pipeline-card__footer">
            <button className="btn btn--ghost btn--sm overview-pipeline-card__cta" type="button" onClick={() => onAction(item.key)}>
              {item.cta} →
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
