import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { Table } from "../../components/Table";
import { themeTokensMock } from "../../mock/adminUiData";

type ThemeTokenRow = (typeof themeTokensMock)[number];

export function CmsThemeTokensPage() {
  return (
    <PageShell title="Theme Tokens" subtitle="Design tokens that power dashboard and website visual consistency.">
      <Card className="card--compact-row">
        <p className="info-text">Token updates are preview-only in this UI scaffold.</p>
        <button className="btn btn--primary" type="button" disabled title="API wiring next step">
          Add Token
        </button>
      </Card>

      <Card className="card--table">
        <Table<ThemeTokenRow>
          rows={themeTokensMock}
          rowKey={(row) => row.id}
          columns={[
            { key: "key", label: "Key", className: "table-cell-strong", render: (row) => row.key },
            { key: "purpose", label: "Purpose", render: (row) => row.purpose },
            { key: "value", label: "Value", render: (row) => row.value },
            { key: "scope", label: "Scope", render: (row) => <Badge tone="default">{row.scope}</Badge> },
            {
              key: "actions",
              label: "Actions",
              render: () => (
                <button className="btn btn--secondary btn--sm" type="button" disabled title="API wiring next step">
                  Edit
                </button>
              ),
            },
          ]}
        />
      </Card>
    </PageShell>
  );
}
