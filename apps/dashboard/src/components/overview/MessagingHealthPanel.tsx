import { Card } from "../Card";
import type { AdminOverviewData } from "../../lib/api";

type MessagingHealthPanelProps = {
  data: AdminOverviewData["messagingHealth"];
  onRetry: (channel: "email" | "whatsapp") => void;
};

export function MessagingHealthPanel({ data, onRetry }: MessagingHealthPanelProps) {
  return (
    <Card className="overview-panel">
      <h3 className="section-title">Messaging Delivery Health</h3>
      <div className="table-wrap overview-table-wrap">
        <table className="table overview-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Draft</th>
              <th>Sent</th>
              <th>Failed</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="table-cell-strong">Email</td>
              <td>{data.email.draft}</td>
              <td>{data.email.sent}</td>
              <td>{data.email.failed}</td>
              <td>
                <button
                  className="btn btn--ghost btn--sm overview-retry-btn"
                  type="button"
                  disabled={data.email.failed <= 0}
                  onClick={() => onRetry("email")}
                >
                  Retry
                </button>
              </td>
            </tr>
            <tr>
              <td className="table-cell-strong">WhatsApp</td>
              <td>{data.whatsapp.draft}</td>
              <td>{data.whatsapp.sent}</td>
              <td>{data.whatsapp.failed}</td>
              <td>
                <button
                  className="btn btn--ghost btn--sm overview-retry-btn"
                  type="button"
                  disabled={data.whatsapp.failed <= 0}
                  onClick={() => onRetry("whatsapp")}
                >
                  Retry
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
