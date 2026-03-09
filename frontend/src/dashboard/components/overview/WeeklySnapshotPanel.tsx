import { Card } from "../Card";

type WeeklySnapshotPanelProps = {
  values: {
    applicationsReceived: number;
    interviewsCompleted: number;
    usersCreated: number;
    messagesSent: number;
  };
};

export function WeeklySnapshotPanel({ values }: WeeklySnapshotPanelProps) {
  return (
    <Card className="overview-panel overview-panel--dark">
      <h3 className="section-title">Weekly Ops Snapshot</h3>
      <div className="stats-grid stats-grid--compact overview-snapshot-grid">
        <div className="overview-snapshot-item">
          <p className="stats-card__label">Applications Received</p>
          <p className="stats-card__value">{values.applicationsReceived}</p>
        </div>
        <div className="overview-snapshot-item">
          <p className="stats-card__label">Interviews Completed</p>
          <p className="stats-card__value">{values.interviewsCompleted}</p>
        </div>
        <div className="overview-snapshot-item">
          <p className="stats-card__label">Users Created</p>
          <p className="stats-card__value">{values.usersCreated}</p>
        </div>
        <div className="overview-snapshot-item">
          <p className="stats-card__label">Messages Sent</p>
          <p className="stats-card__value">{values.messagesSent}</p>
        </div>
      </div>
    </Card>
  );
}
