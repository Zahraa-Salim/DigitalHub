import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { Table } from "../../components/Table";
import { cmsPagesMock } from "../../mock/adminUiData";
import { formatDateTime } from "../../utils/format";

type CmsPageRow = (typeof cmsPagesMock)[number];

export function CmsPagesPage() {
  const [selectedId, setSelectedId] = useState<number>(cmsPagesMock[0]?.id ?? 0);

  const selectedPage = useMemo(
    () => cmsPagesMock.find((item) => item.id === selectedId) ?? cmsPagesMock[0],
    [selectedId],
  );

  return (
    <PageShell title="Pages" subtitle="Manage website content pages and prepare drafts before publishing.">
      <div className="two-col-grid two-col-grid--uneven">
        <Card className="card--table">
          <Table<CmsPageRow>
            rows={cmsPagesMock}
            rowKey={(row) => row.id}
            columns={[
              { key: "title", label: "Page", className: "table-cell-strong", render: (row) => row.title },
              { key: "key", label: "Key", render: (row) => row.key },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <Badge tone={row.isPublished ? "published" : "draft"}>
                    {row.isPublished ? "published" : "draft"}
                  </Badge>
                ),
              },
              { key: "updated", label: "Updated", render: (row) => formatDateTime(row.updatedAt) },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <button className="btn btn--secondary btn--sm" type="button" onClick={() => setSelectedId(row.id)}>
                    Edit
                  </button>
                ),
              },
            ]}
          />
        </Card>

        <Card>
          <h3 className="section-title">Page Editor Preview</h3>
          {selectedPage ? (
            <div className="form-stack">
              <label className="field">
                <span className="field__label">Title</span>
                <input className="field__control" value={selectedPage.title} readOnly />
              </label>
              <label className="field">
                <span className="field__label">Key</span>
                <input className="field__control" value={selectedPage.key} readOnly />
              </label>
              <label className="field">
                <span className="field__label">Content</span>
                <textarea className="textarea-control textarea-control--tall" value={selectedPage.content} readOnly />
              </label>
              <button className="btn btn--primary" type="button" disabled title="API wiring next step">
                Save Page
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state__title">No page selected</p>
              <p className="empty-state__description">Choose a page from the list to preview its editable content.</p>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
