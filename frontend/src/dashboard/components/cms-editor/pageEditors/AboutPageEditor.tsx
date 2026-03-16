type Props = {
  content: Record<string, unknown>;
  onChange: (path: string, value: unknown) => void;
};

const str = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

const strArr = (value: unknown, fallback: string[] = []): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return value.split("\n").map((item) => item.trim()).filter(Boolean);
  return fallback;
};

export function AboutPageEditor({ content, onChange }: Props) {
  const heroPills = strArr(content.hero_pills, ["Industry-led tracks", "Portfolio-focused delivery", "Career readiness support"]);
  const programNames = strArr(content.program_names, []);

  const setStrArr = (field: string, raw: string) => {
    onChange(field, raw.split("\n").map((item) => item.trim()).filter(Boolean));
  };

  return (
    <div className="cms-page-editor">
      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Hero section</h3>
        <label className="cms-page-editor__field">
          <span>Tag / eyebrow</span>
          <input type="text" value={str(content.hero_tag, "About Digital Hub")} onChange={(e) => onChange("hero_tag", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Title — main text</span>
          <input type="text" value={str(content.hero_title_primary, "Practical Training For")} onChange={(e) => onChange("hero_title_primary", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Title — highlighted word(s)</span>
          <input type="text" value={str(content.hero_title_highlight, "Career Outcomes")} onChange={(e) => onChange("hero_title_highlight", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Description</span>
          <textarea rows={3} value={str(content.hero_subtitle)} onChange={(e) => onChange("hero_subtitle", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Pills (one per line)</span>
          <textarea
            rows={4}
            value={heroPills.join("\n")}
            onChange={(e) => setStrArr("hero_pills", e.target.value)}
            placeholder={"Industry-led tracks\nPortfolio-focused delivery\nCareer readiness support"}
          />
        </label>
        <label className="cms-page-editor__field">
          <span>Hero image URL</span>
          <input
            type="text"
            value={str(content.hero_image_url)}
            onChange={(e) => onChange("hero_image_url", e.target.value)}
            placeholder="https://... or leave blank for default"
          />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">CTA buttons</h3>
        <label className="cms-page-editor__field">
          <span>Primary button label</span>
          <input type="text" value={str(content.primary_cta_text, "Apply Now")} onChange={(e) => onChange("primary_cta_text", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Primary button link</span>
          <input type="text" value={str(content.primary_cta_link, "/apply")} onChange={(e) => onChange("primary_cta_link", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Secondary button label</span>
          <input type="text" value={str(content.secondary_cta_text, "Browse Programs")} onChange={(e) => onChange("secondary_cta_text", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Secondary button link</span>
          <input type="text" value={str(content.secondary_cta_link, "/programs")} onChange={(e) => onChange("secondary_cta_link", e.target.value)} />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Outcomes section</h3>
        <label className="cms-page-editor__field">
          <span>Eyebrow</span>
          <input type="text" value={str(content.outcomes_eyebrow, "How We Measure Outcomes")} onChange={(e) => onChange("outcomes_eyebrow", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Title</span>
          <input type="text" value={str(content.outcomes_title, "Delivery Metrics")} onChange={(e) => onChange("outcomes_title", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Description</span>
          <textarea rows={2} value={str(content.outcomes_description)} onChange={(e) => onChange("outcomes_description", e.target.value)} />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Programs section</h3>
        <label className="cms-page-editor__field">
          <span>Eyebrow</span>
          <input type="text" value={str(content.programs_eyebrow, "Programs")} onChange={(e) => onChange("programs_eyebrow", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Title</span>
          <input type="text" value={str(content.programs_title, "Program Names")} onChange={(e) => onChange("programs_title", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Description</span>
          <textarea rows={2} value={str(content.programs_description)} onChange={(e) => onChange("programs_description", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Fallback program names (one per line — used if no programs in DB)</span>
          <textarea
            rows={6}
            value={programNames.join("\n")}
            onChange={(e) => setStrArr("program_names", e.target.value)}
            placeholder={"Full Stack Development\nBackend Engineering\nFrontend Engineering"}
          />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Focus section</h3>
        <label className="cms-page-editor__field">
          <span>Eyebrow</span>
          <input type="text" value={str(content.focus_eyebrow, "What We Deliver")} onChange={(e) => onChange("focus_eyebrow", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Title</span>
          <input type="text" value={str(content.focus_title, "How The Learning Experience Works")} onChange={(e) => onChange("focus_title", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Description</span>
          <textarea rows={2} value={str(content.focus_description)} onChange={(e) => onChange("focus_description", e.target.value)} />
        </label>
      </div>

      <div className="cms-page-editor__section">
        <h3 className="cms-page-editor__section-title">Journey section</h3>
        <label className="cms-page-editor__field">
          <span>Eyebrow</span>
          <input type="text" value={str(content.journey_eyebrow, "Mission In Action")} onChange={(e) => onChange("journey_eyebrow", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Title</span>
          <input type="text" value={str(content.journey_title, "From Learning To Delivery")} onChange={(e) => onChange("journey_title", e.target.value)} />
        </label>
        <label className="cms-page-editor__field">
          <span>Description</span>
          <textarea rows={2} value={str(content.journey_description)} onChange={(e) => onChange("journey_description", e.target.value)} />
        </label>
      </div>
    </div>
  );
}
