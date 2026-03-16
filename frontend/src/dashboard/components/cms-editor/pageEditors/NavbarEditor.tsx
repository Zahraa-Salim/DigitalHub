type Props = {
  content: Record<string, unknown>;
  onChange: (path: string, value: unknown) => void;
};

const str = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const asText = (value: unknown) => (typeof value === "string" ? value : "");

export function NavbarEditor({ content, onChange }: Props) {
  const links = Array.isArray(content.links) ? (content.links as Record<string, unknown>[]) : [];

  const updateLink = (index: number, field: string, value: string) => {
    const next = links.map((link, i) => (i === index ? { ...link, [field]: value } : link));
    onChange("links", next);
  };

  const addLink = () => {
    onChange("links", [...links, { label: "New link", url: "/" }]);
  };

  const removeLink = (index: number) => {
    onChange("links", links.filter((_, i) => i !== index));
  };

  return (
    <div className="cms-page-editor">
      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Logo</h3>
        <label className="cms-page-editor__field">
          <span>Logo image URL</span>
          <input
            type="text"
            value={str(content.logo_url)}
            onChange={(e) => onChange("logo_url", e.target.value)}
            placeholder="https://... or leave blank for default"
          />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Primary CTA button</h3>
        <label className="cms-page-editor__field">
          <span>Label</span>
          <input
            type="text"
            value={str(content.primary_cta_label, "Apply Now")}
            onChange={(e) => onChange("primary_cta_label", e.target.value)}
            placeholder="Apply Now"
          />
        </label>
        <label className="cms-page-editor__field">
          <span>Link</span>
          <input
            type="text"
            value={str(content.primary_cta_link, "/apply")}
            onChange={(e) => onChange("primary_cta_link", e.target.value)}
            placeholder="/apply"
          />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Secondary CTA button</h3>
        <label className="cms-page-editor__field">
          <span>Label</span>
          <input
            type="text"
            value={str(content.secondary_cta_label, "Hire Talent")}
            onChange={(e) => onChange("secondary_cta_label", e.target.value)}
            placeholder="Hire Talent"
          />
        </label>
        <label className="cms-page-editor__field">
          <span>Link</span>
          <input
            type="text"
            value={str(content.secondary_cta_link, "/hire-talent")}
            onChange={(e) => onChange("secondary_cta_link", e.target.value)}
            placeholder="/hire-talent"
          />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Navigation links</h3>
        <p className="cms-page-editor__hint">
          Each link has a label and a URL. To add a dropdown, use the JSON editor in the Pages section for advanced menu items.
        </p>
        {links.map((link, index) => (
          <div key={index} className="cms-page-editor__list-row">
            <input
              type="text"
              value={asText(link.label ?? link.title)}
              onChange={(e) => updateLink(index, "label", e.target.value)}
              placeholder="Label"
              style={{ flex: 1 }}
            />
            <input
              type="text"
              value={asText(link.url ?? link.link)}
              onChange={(e) => updateLink(index, "url", e.target.value)}
              placeholder="/path"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="cms-page-editor__remove-btn"
              onClick={() => removeLink(index)}
              title="Remove link"
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="cms-page-editor__add-btn" onClick={addLink}>
          + Add link
        </button>
      </div>
    </div>
  );
}
