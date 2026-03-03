"use client";

type Props = {
  profile: {
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    portfolioUrl?: string | null;
  };
  onChange: (key: string, value: any) => void;
  onSave: () => void;
  saving: boolean;
};

export default function SocialLinksSection({
  profile,
  onChange,
  onSave,
  saving,
}: Props) {
  return (
    <div className="instructor__profile-form-wrap mb-4">
      <h5 className="mb-3">Social Links</h5>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label className="form-label">LinkedIn</label>
          <input
            className="form-control"
            value={profile.linkedinUrl || ""}
            onChange={(e) => onChange("linkedinUrl", e.target.value)}
          />
        </div>

        <div className="col-md-4 mb-3">
          <label className="form-label">GitHub</label>
          <input
            className="form-control"
            value={profile.githubUrl || ""}
            onChange={(e) => onChange("githubUrl", e.target.value)}
          />
        </div>

        <div className="col-md-4 mb-3">
          <label className="form-label">Portfolio</label>
          <input
            className="form-control"
            value={profile.portfolioUrl || ""}
            onChange={(e) => onChange("portfolioUrl", e.target.value)}
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
