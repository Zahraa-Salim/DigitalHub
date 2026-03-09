import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Table } from "../../components/Table";
import { ApiError, api } from "../../utils/api";
import type { AdminRecord } from "./adminManagement";
import { formatAdminRole } from "./adminManagement";

export function AdminsPage() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadAdmins = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api<AdminRecord[]>("/api/admins");
        if (active) {
          setAdmins(data);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        if (err instanceof ApiError) {
          setError(err.message || "Failed to load admins.");
        } else {
          setError("Failed to load admins.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAdmins();

    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return admins.filter((item) => {
      if (status === "active" && !item.is_active) {
        return false;
      }
      if (status === "inactive" && item.is_active) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${item.full_name} ${item.email ?? ""} ${item.phone ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [admins, search, status]);

  return (
    <PageShell
      title="Admin Management"
      subtitle="Super admin authority context for managing admin accounts."
      actions={
        <button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={() => navigate("/admin/admins/create")}>
          Create Admin
        </button>
      }
    >
      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, or phone"
        selects={[
          {
            label: "Status",
            value: status,
            options: [
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
            onChange: setStatus,
          },
        ]}
      />

      {error ? (
        <Card>
          <p className="alert alert--error">{error}</p>
        </Card>
      ) : null}

      <Card className="card--table">
        {loading ? (
          <div className="program-skeleton-table" aria-hidden>
            <div className="program-skeleton-line program-skeleton-line--lg" />
            <div className="program-skeleton-line" />
            <div className="program-skeleton-line program-skeleton-line--sm" />
          </div>
        ) : (
          <Table<AdminRecord>
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage="No admin accounts found."
            columns={[
              {
                key: "name",
                label: "Name",
                className: "table-cell-strong",
                render: (row) => (
                  <button className="program-title-btn" type="button" onClick={() => navigate(`/admin/admins/${row.id}`)}>
                    {row.full_name}
                  </button>
                ),
              },
              { key: "email", label: "Email", render: (row) => row.email || "N/A" },
              { key: "phone", label: "Phone", render: (row) => row.phone || "N/A" },
              { key: "role", label: "Role", render: (row) => <Badge tone="default">{formatAdminRole(row.admin_role)}</Badge> },
              { key: "status", label: "Status", render: (row) => <Badge tone="default">{row.is_active ? "Active" : "Inactive"}</Badge> },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="table-actions">
                    <button className="btn btn--secondary btn--sm" type="button" onClick={() => navigate(`/admin/admins/${row.id}`)}>
                      Manage
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
    </PageShell>
  );
}

