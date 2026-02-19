import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { homeSectionsMock } from "../../mock/adminUiData";

export function CmsHomeSectionsPage() {
  return (
    <PageShell title="Home Sections" subtitle="Control homepage section order and visibility for public visitors.">
      <Card>
        <div className="home-sections-list">
          {homeSectionsMock.map((section) => (
            <div className="home-section-item" key={section.id}>
              <div>
                <p className="list-row__title">{section.title}</p>
                <p className="list-row__meta">
                  key: {section.key} | sort_order: {section.sortOrder}
                </p>
              </div>
              <label className="toggle-wrap" title="API wiring next step">
                <input type="checkbox" checked={section.enabled} readOnly disabled />
                <span>{section.enabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card className="card--compact-row">
        <p className="info-text">Drag-and-drop ordering and persistence will be added after API integration.</p>
        <button className="btn btn--secondary" type="button" disabled title="API wiring next step">
          Save Section Order
        </button>
      </Card>
    </PageShell>
  );
}
