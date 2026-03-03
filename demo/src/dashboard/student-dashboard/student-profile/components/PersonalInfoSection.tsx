"use client";

type Props = {
  profile: {
    fullName: string;
    email: string;
    headline?: string | null;
    about?: string | null;
  };
  onChange: (key: string, value: any) => void;
  onSave: () => void;
  saving: boolean;
};

export default function PersonalInfoSection({
  profile,
  onChange,
  onSave,
  saving,
}: Props) {
  return (
    <div className="instructor__profile-form-wrap mb-4">
      <h5 className="mb-3">Personal Information</h5>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Full Name</label>
          <input className="form-control" value={profile.fullName} disabled />
        </div>

        <div className="col-md-6 mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" value={profile.email} disabled />
        </div>

        <div className="col-12 mb-3">
          <label className="form-label">Headline *</label>
          <input
            className="form-control"
            value={profile.headline || ""}
            onChange={(e) => onChange("headline", e.target.value)}
          />
        </div>

        <div className="col-12 mb-3">
          <label className="form-label">About</label>
          <textarea
            className="form-control"
            rows={4}
            value={profile.about || ""}
            onChange={(e) => onChange("about", e.target.value)}
          />
        </div>

        <div className="col-12">
          <button
            className="btn btn-two"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
