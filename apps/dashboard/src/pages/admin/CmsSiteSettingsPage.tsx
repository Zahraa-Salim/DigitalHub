import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";

export function CmsSiteSettingsPage() {
  return (
    <PageShell title="Site Settings" subtitle="Define global website defaults used across public pages.">
      <div className="two-col-grid">
        <Card>
          <h3 className="section-title">General</h3>
          <div className="form-stack">
            <label className="field">
              <span className="field__label">Site Name</span>
              <input className="field__control" defaultValue="Digital Hub" />
            </label>
            <label className="field">
              <span className="field__label">Default Event Location</span>
              <input className="field__control" defaultValue="Digital Hub Main Hall" />
            </label>
            <label className="field">
              <span className="field__label">Contact Email</span>
              <input className="field__control" defaultValue="hello@digitalhub.com" />
            </label>
            <label className="field">
              <span className="field__label">Contact Phone</span>
              <input className="field__control" defaultValue="+20 100 222 3344" />
            </label>
          </div>
        </Card>

        <Card>
          <h3 className="section-title">Social Links</h3>
          <div className="form-stack">
            <label className="field">
              <span className="field__label">Facebook</span>
              <input className="field__control" defaultValue="https://facebook.com/digitalhub" />
            </label>
            <label className="field">
              <span className="field__label">LinkedIn</span>
              <input className="field__control" defaultValue="https://linkedin.com/company/digitalhub" />
            </label>
            <label className="field">
              <span className="field__label">Instagram</span>
              <input className="field__control" defaultValue="https://instagram.com/digitalhub" />
            </label>
            <label className="field">
              <span className="field__label">Website URL</span>
              <input className="field__control" defaultValue="https://digitalhub.com" />
            </label>
          </div>
        </Card>
      </div>

      <Card className="card--compact-row">
        <p className="info-text">Changes are local placeholders for now. Save action will be wired in the next API step.</p>
        <button className="btn btn--primary" type="button" disabled title="API wiring next step">
          Save changes
        </button>
      </Card>
    </PageShell>
  );
}
