import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { profileMock } from "../../mock/adminUiData";

export function MyProfilePage() {
  return (
    <PageShell title="My Profile" subtitle="Personal admin account details and workspace preferences.">
      <div className="profile-grid">
        <Card>
          <div className="profile-main">
            <span className="profile-avatar" aria-hidden>
              {profileMock.name.charAt(0)}
            </span>
            <div>
              <h3 className="section-title">{profileMock.name}</h3>
              <p className="info-text">{profileMock.email}</p>
            </div>
          </div>
          <div className="profile-badges">
            <Badge tone="default">{profileMock.role}</Badge>
            <Badge tone="default">{profileMock.department}</Badge>
            <Badge tone="default">{profileMock.timezone}</Badge>
          </div>
        </Card>

        <Card>
          <h3 className="section-title">Account Notes</h3>
          <p className="info-text">
            This area will include profile editing and password update actions once API endpoints are connected.
          </p>
          <button className="btn btn--secondary btn--sm" type="button" disabled title="API wiring next step">
            Edit Profile
          </button>
        </Card>
      </div>
    </PageShell>
  );
}
