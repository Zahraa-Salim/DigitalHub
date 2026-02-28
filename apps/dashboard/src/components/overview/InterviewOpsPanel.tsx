import { Card } from "../Card";
import type { AdminOverviewData } from "../../lib/api";

type InterviewOpsPanelProps = {
  data: AdminOverviewData["interviews"];
};

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function InterviewOpsPanel({ data }: InterviewOpsPanelProps) {
  return (
    <Card className="overview-panel">
      <div className="notification-card__header overview-panel__header">
        <h3 className="section-title">Interview Operations</h3>
        <p className="info-text overview-panel__hint">
          Confirmed vs Invited: <span className="text-strong">{toPercent(data.confirmRate)}</span>
        </p>
      </div>
      <div className="list-stack overview-metric-list">
        <div className="list-row overview-metric-row">
          <p className="list-row__title">Today&apos;s Interviews</p>
          <p className="list-row__title">{data.today}</p>
        </div>
        <div className="list-row overview-metric-row">
          <p className="list-row__title">Upcoming Interviews</p>
          <p className="list-row__title">{data.upcoming}</p>
        </div>
        <div className="list-row overview-metric-row">
          <p className="list-row__title">Pending Confirmations</p>
          <p className="list-row__title">{data.pendingConfirmations}</p>
        </div>
        <div className="list-row overview-metric-row">
          <p className="list-row__title">Reschedule Requests</p>
          <p className="list-row__title">{data.rescheduleRequests}</p>
        </div>
      </div>
    </Card>
  );
}
