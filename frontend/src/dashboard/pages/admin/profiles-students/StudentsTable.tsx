// File: frontend/src/dashboard/pages/admin/profiles-students/StudentsTable.tsx
// Purpose: Renders the admin students table page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import { Badge } from "../../../components/Badge";
import type { StudentRow } from "./types";
import { getStudentStatus, summarizeCohorts } from "./types";

type StudentsTableProps = {
  rows: StudentRow[];
  selectedIds: Set<number>;
  onToggleRow: (id: number) => void;
  onView: (row: StudentRow) => void;
  onMessage: (row: StudentRow) => void;
  onSetDropout: (row: StudentRow) => void;
  onSetActive: (row: StudentRow) => void;
};

export function StudentsTable({
  rows,
  selectedIds,
  onToggleRow,
  onView,
  onMessage,
  onSetDropout,
  onSetActive,
}: StudentsTableProps) {
  return (
    <section className="students-table-shell">
      <div className="students-table-wrap">
        <table className="students-table">
          <thead>
            <tr>
              <th className="students-table__select-col" aria-label="Select row" />
              <th>Student</th>
              <th>Course</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => {
                const status = getStudentStatus(row);
                return (
                  <tr key={row.user_id}>
                    <td className="students-table__select-col">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.user_id)}
                        onChange={() => onToggleRow(row.user_id)}
                        aria-label={`Select ${row.full_name || "student"}`}
                      />
                    </td>
                    <td>
                      <button className="program-title-btn" type="button" onClick={() => onView(row)}>
                        {row.full_name?.trim() || "Unnamed student"}
                      </button>
                    </td>
                    <td>{summarizeCohorts(row.cohorts)}</td>
                    <td>
                      <Badge tone={status === "active" ? "resolved" : "draft"}>{status}</Badge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn--secondary btn--sm" type="button" onClick={() => onView(row)}>
                          View
                        </button>
                        <button className="btn btn--primary btn--sm" type="button" onClick={() => onMessage(row)}>
                          Message
                        </button>
                        {status === "active" ? (
                          <button className="btn btn--danger btn--sm" type="button" onClick={() => onSetDropout(row)}>
                            Set Dropout
                          </button>
                        ) : (
                          <button className="btn btn--success btn--sm" type="button" onClick={() => onSetActive(row)}>
                            Set Active
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <p className="empty-state__title">No applications found</p>
                    <p className="empty-state__description">No records match your current filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

