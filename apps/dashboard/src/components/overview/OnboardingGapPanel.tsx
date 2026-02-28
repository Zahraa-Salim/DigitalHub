import { Card } from "../Card";
import type { AdminOverviewData } from "../../lib/api";

type OnboardingGapPanelProps = {
  data: AdminOverviewData["onboardingGaps"];
};

function toRate(numerator: number, denominator: number): string {
  if (denominator <= 0) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function OnboardingGapPanel({ data }: OnboardingGapPanelProps) {
  return (
    <Card className="overview-panel">
      <h3 className="section-title">Onboarding Gaps</h3>
      <div className="list-stack overview-metric-list">
        <div className="list-row overview-metric-row">
          <div>
            <p className="list-row__title">Accepted</p>
          </div>
          <p className="list-row__title">{data.accepted}</p>
        </div>
        <div className="list-row overview-metric-row">
          <div>
            <p className="list-row__title">Participation Confirmed</p>
            <p className="list-row__meta">{toRate(data.participationConfirmed, data.accepted)} conversion</p>
          </div>
          <p className="list-row__title">{data.participationConfirmed}</p>
        </div>
        <div className="list-row overview-metric-row">
          <div>
            <p className="list-row__title">User Created</p>
            <p className="list-row__meta">{toRate(data.userCreated, data.participationConfirmed)} conversion</p>
          </div>
          <p className="list-row__title">{data.userCreated}</p>
        </div>
        <div className="list-row overview-metric-row">
          <div>
            <p className="list-row__title">Enrollment Created</p>
            <p className="list-row__meta">{toRate(data.enrollmentCreated, data.userCreated)} conversion</p>
          </div>
          <p className="list-row__title">{data.enrollmentCreated}</p>
        </div>
      </div>
    </Card>
  );
}
