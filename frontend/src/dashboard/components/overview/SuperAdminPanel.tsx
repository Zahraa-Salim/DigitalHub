import { Badge } from "../Badge";
import { Card } from "../Card";
import { formatDateTime } from "../../utils/format";
import type { AdminOverviewData } from "../../lib/api";

type SuperAdminPanelProps = {
  admins: NonNullable<AdminOverviewData["superAdmin"]>["admins"];
};

export function SuperAdminPanel({ admins }: SuperAdminPanelProps) {
  return (
    <Card className="overview-panel overview-panel--super">
      <h3 className="section-title">Super Admin Panel</h3>
      {admins.length === 0 ? (
        <p className="info-text">No admin users found.</p>
      ) : (
        <div className="table-wrap overview-table-wrap">
          <table className="table overview-table">
            <thead>
              <tr>
                <th>Admin Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.user_id}>
                  <td className="table-cell-strong">{admin.name}</td>
                  <td>{admin.role}</td>
                  <td>
                    <Badge tone={admin.is_active ? "open" : "cancelled"}>{admin.is_active ? "active" : "disabled"}</Badge>
                  </td>
                  <td>{admin.last_login_at ? formatDateTime(admin.last_login_at) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
