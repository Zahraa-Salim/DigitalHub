import { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { PageShell } from "../components/PageShell";
import { StatsCard } from "../components/StatsCard";
import { ApiError, apiList } from "../utils/api";
import { formatDateTime } from "../utils/format";
import { buildQueryString } from "../utils/query";

type ApplicationItem = {
  id: number | string;
  full_name: string | null;
  email: string | null;
  status: string;
  submitted_at: string;
};

type CohortItem = {
  id: number | string;
  name: string;
  status: string;
  updated_at: string;
};

type ContactItem = {
  id: number | string;
  name: string;
  email: string;
  status: string;
  created_at: string;
};

type NotificationItem = {
  id: number | string;
  title: string;
  body: string;
  created_at: string;
};

type OverviewState = {
  pendingApplications: { total: number; items: ApplicationItem[] };
  openCohorts: { total: number; items: CohortItem[] };
  newContacts: { total: number; items: ContactItem[] };
  unreadNotifications: { total: number; items: NotificationItem[] };
};

const initialState: OverviewState = {
  pendingApplications: { total: 0, items: [] },
  openCohorts: { total: 0, items: [] },
  newContacts: { total: 0, items: [] },
  unreadNotifications: { total: 0, items: [] },
};

export function OverviewPage() {
  const [state, setState] = useState<OverviewState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [applicationsResult, cohortsResult, contactsResult, notificationsResult] = await Promise.all([
          apiList<ApplicationItem>(
            `/applications${buildQueryString({
              status: "pending",
              limit: 5,
              sortBy: "submitted_at",
              order: "desc",
            })}`,
          ),
          apiList<CohortItem>(
            `/cohorts${buildQueryString({
              status: "open",
              limit: 5,
              sortBy: "updated_at",
              order: "desc",
            })}`,
          ),
          apiList<ContactItem>(
            `/contact${buildQueryString({
              status: "new",
              limit: 5,
              sortBy: "created_at",
              order: "desc",
            })}`,
          ),
          apiList<NotificationItem>(
            `/notifications${buildQueryString({
              is_read: false,
              limit: 5,
              sortBy: "created_at",
              order: "desc",
            })}`,
          ),
        ]);

        if (!active) {
          return;
        }

        setState({
          pendingApplications: {
            total: applicationsResult.pagination.total,
            items: applicationsResult.data,
          },
          openCohorts: {
            total: cohortsResult.pagination.total,
            items: cohortsResult.data,
          },
          newContacts: {
            total: contactsResult.pagination.total,
            items: contactsResult.data,
          },
          unreadNotifications: {
            total: notificationsResult.pagination.total,
            items: notificationsResult.data,
          },
        });
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load overview data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      label: "Pending Applications",
      value: String(state.pendingApplications.total),
      hint: "Need review",
    },
    {
      label: "Open Cohorts",
      value: String(state.openCohorts.total),
      hint: "Accepting submissions",
    },
    {
      label: "New Contacts",
      value: String(state.newContacts.total),
      hint: "Awaiting response",
    },
    {
      label: "Unread Notifications",
      value: String(state.unreadNotifications.total),
      hint: "Dashboard alerts",
    },
  ];

  return (
    <PageShell title="Overview" subtitle="Quick snapshot of current platform activity.">
      <div className="stats-grid">
        {stats.map((item) => (
          <StatsCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>

      {loading ? (
        <Card>
          <div className="spinner">Loading overview data...</div>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <p className="alert alert--error">{error}</p>
        </Card>
      ) : null}

      {!loading && !error ? (
        <div className="two-col-grid">
          <Card>
            <h3 className="section-title">Pending Applications</h3>
            <div className="list-stack">
              {state.pendingApplications.items.map((item) => (
                <div className="list-row" key={item.id}>
                  <div>
                    <p className="list-row__title">{item.full_name || "Applicant"}</p>
                    <p className="list-row__meta">{item.email || "No email"}</p>
                  </div>
                  <div className="list-row__right">
                    <Badge tone="pending">{item.status}</Badge>
                    <p className="list-row__meta">{formatDateTime(item.submitted_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="section-title">Open Cohorts</h3>
            <div className="list-stack">
              {state.openCohorts.items.map((item) => (
                <div className="list-row" key={item.id}>
                  <div>
                    <p className="list-row__title">{item.name}</p>
                    <p className="list-row__meta">Updated {formatDateTime(item.updated_at)}</p>
                  </div>
                  <Badge tone="open">{item.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="section-title">New Contact Messages</h3>
            <div className="list-stack">
              {state.newContacts.items.map((item) => (
                <div className="list-row" key={item.id}>
                  <div>
                    <p className="list-row__title">{item.name}</p>
                    <p className="list-row__meta">{item.email}</p>
                  </div>
                  <div className="list-row__right">
                    <Badge tone="pending">{item.status}</Badge>
                    <p className="list-row__meta">{formatDateTime(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="section-title">Unread Notifications</h3>
            <div className="list-stack">
              {state.unreadNotifications.items.map((item) => (
                <div className="list-row" key={item.id}>
                  <div>
                    <p className="list-row__title">{item.title}</p>
                    <p className="list-row__meta">{item.body}</p>
                  </div>
                  <p className="list-row__meta">{formatDateTime(item.created_at)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
