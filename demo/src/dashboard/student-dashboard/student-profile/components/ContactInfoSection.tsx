"use client";

type Props = {
  profile: {
    phone?: string | null;
    country?: string | null;
    city?: string | null;
  };
  onChange: (key: string, value: any) => void;
  onSave: () => void;
  saving: boolean;
};

export default function ContactInfoSection({
  profile,
  onChange,
  onSave,
  saving,
}: Props) {
  return (
    <div className="instructor__profile-form-wrap mb-4">
      <h5 className="mb-3">Contact Information</h5>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label className="form-label">Phone</label>
          <input
            className="form-control"
            value={profile.phone || ""}
            onChange={(e) => onChange("phone", e.target.value)}
          />
        </div>

        <div className="col-md-4 mb-3">
          <label className="form-label">Country *</label>
          <input
            className="form-control"
            value={profile.country || ""}
            onChange={(e) => onChange("country", e.target.value)}
          />
        </div>

        <div className="col-md-4 mb-3">
          <label className="form-label">City *</label>
          <input
            className="form-control"
            value={profile.city || ""}
            onChange={(e) => onChange("city", e.target.value)}
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
