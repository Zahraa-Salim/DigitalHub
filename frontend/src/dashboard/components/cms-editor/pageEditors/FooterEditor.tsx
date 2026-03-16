type Props = {
  content: Record<string, unknown>;
  onChange: (path: string, value: unknown) => void;
};

const str = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const asText = (value: unknown) => (typeof value === "string" ? value : "");

export function FooterEditor({ content, onChange }: Props) {
  const socials = Array.isArray(content.social_links) ? (content.social_links as Record<string, unknown>[]) : [];

  const updateSocial = (index: number, field: string, value: string) => {
    const next = socials.map((social, i) => (i === index ? { ...social, [field]: value } : social));
    onChange("social_links", next);
  };

  const addSocial = () => {
    onChange("social_links", [...socials, { name: "", url: "" }]);
  };

  const removeSocial = (index: number) => {
    onChange("social_links", socials.filter((_, i) => i !== index));
  };

  return (
    <div className="cms-page-editor">
      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Brand</h3>
        <label className="cms-page-editor__field">
          <span>Site name</span>
          <input
            type="text"
            value={str(content.brand_title, "The Digital Hub")}
            onChange={(e) => onChange("brand_title", e.target.value)}
            placeholder="The Digital Hub"
          />
        </label>
        <label className="cms-page-editor__field">
          <span>Copyright year</span>
          <input
            type="text"
            value={str(content.copyright_text, new Date().getFullYear().toString())}
            onChange={(e) => onChange("copyright_text", e.target.value)}
            placeholder="2026"
          />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Get in touch section</h3>
        <label className="cms-page-editor__field">
          <span>Title</span>
          <input
            type="text"
            value={str(content.get_in_touch_title, "Get In Touch")}
            onChange={(e) => onChange("get_in_touch_title", e.target.value)}
            placeholder="Get In Touch"
          />
        </label>
        <label className="cms-page-editor__field">
          <span>Text</span>
          <textarea
            rows={3}
            value={str(content.get_in_touch_text)}
            onChange={(e) => onChange("get_in_touch_text", e.target.value)}
            placeholder="Stay connected..."
          />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Legal links labels</h3>
        <label className="cms-page-editor__field">
          <span>Terms label</span>
          <input
            type="text"
            value={str(content.terms_label, "Terms of Use")}
            onChange={(e) => onChange("terms_label", e.target.value)}
            placeholder="Terms of Use"
          />
        </label>
        <label className="cms-page-editor__field">
          <span>Privacy label</span>
          <input
            type="text"
            value={str(content.privacy_label, "Privacy Policy")}
            onChange={(e) => onChange("privacy_label", e.target.value)}
            placeholder="Privacy Policy"
          />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Social links</h3>
        <p className="cms-page-editor__hint">
          Name values: <code>facebook</code>, <code>instagram</code>, <code>linkedin</code>, <code>twitter</code>, <code>youtube</code>, <code>whatsapp</code>, <code>github</code>
        </p>
        {socials.map((social, index) => (
          <div key={index} className="cms-page-editor__list-row">
            <input
              type="text"
              value={asText(social.name ?? social.label)}
              onChange={(e) => updateSocial(index, "name", e.target.value)}
              placeholder="linkedin"
              style={{ flex: 1 }}
            />
            <input
              type="text"
              value={asText(social.url ?? social.link)}
              onChange={(e) => updateSocial(index, "url", e.target.value)}
              placeholder="https://..."
              style={{ flex: 2 }}
            />
            <button
              type="button"
              className="cms-page-editor__remove-btn"
              onClick={() => removeSocial(index)}
              title="Remove"
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="cms-page-editor__add-btn" onClick={addSocial}>
          + Add social link
        </button>
      </div>
    </div>
  );
}
