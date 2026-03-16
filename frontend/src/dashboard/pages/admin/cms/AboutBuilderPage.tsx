import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { PageShell } from "../../../components/PageShell";
import { api, apiList } from "../../../utils/api";
import "../../../styles/about-builder.css";

type SectionType =
  | "hero"
  | "stats"
  | "section_head"
  | "card_grid"
  | "steps"
  | "table"
  | "text_block"
  | "image_full"
  | "two_col"
  | "list"
  | "spacer";

type AboutSection = {
  id: string;
  type: SectionType;
  enabled: boolean;
  bgColor: string;
  data: Record<string, unknown>;
};

type BuilderState = {
  sections: AboutSection[];
  pageId: number | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  dirty: boolean;
};

type CmsPageRow = {
  id: number;
  key: string;
  title: string | null;
  content: Record<string, unknown> | null;
  is_published: boolean;
  updated_at: string;
};

type SectionFieldProps = {
  section: AboutSection;
  update: (field: string, value: unknown) => void;
};

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: "Hero banner",
  stats: "Stats row",
  section_head: "Section heading",
  card_grid: "Card grid",
  steps: "Steps / Journey",
  table: "Data table",
  text_block: "Text block",
  image_full: "Full-width image",
  two_col: "Two columns",
  list: "List",
  spacer: "Spacer",
};

const SECTION_TYPE_ACCENTS: Record<SectionType, string> = {
  hero: "#4361ee",
  stats: "#0ea5e9",
  section_head: "#7c3aed",
  card_grid: "#f59e0b",
  steps: "#10b981",
  table: "#f97316",
  text_block: "#6366f1",
  image_full: "#ec4899",
  two_col: "#14b8a6",
  list: "#8b5cf6",
  spacer: "#94a3b8",
};

const SECTION_TYPE_CATALOG: Array<{ type: SectionType; label: string; icon: string; desc: string }> = [
  { type: "hero", label: "Hero banner", icon: "⬛", desc: "Large header with image and CTAs" },
  { type: "stats", label: "Stats row", icon: "📊", desc: "Metric cards with numbers" },
  { type: "section_head", label: "Section heading", icon: "📝", desc: "Eyebrow, title, description" },
  { type: "card_grid", label: "Card grid", icon: "⊞", desc: "Grid of feature or focus cards" },
  { type: "steps", label: "Steps / Journey", icon: "→", desc: "Numbered step sequence" },
  { type: "table", label: "Data table", icon: "⊟", desc: "Rows and columns of data" },
  { type: "text_block", label: "Text block", icon: "¶", desc: "Free text with background color" },
  { type: "image_full", label: "Full-width image", icon: "🖼", desc: "Image with caption" },
  { type: "two_col", label: "Two columns", icon: "⊞", desc: "Side-by-side content" },
  { type: "list", label: "List", icon: "≡", desc: "Bullet, numbered, or checklist" },
  { type: "spacer", label: "Spacer", icon: "↕", desc: "Vertical space between sections" },
];

const INITIAL_STATE: BuilderState = {
  sections: [],
  pageId: null,
  loading: true,
  saving: false,
  error: null,
  success: null,
  dirty: false,
};

const METRIC_OPTIONS = [
  { value: "team_number", label: "Team Number" },
  { value: "programs", label: "Programs" },
  { value: "cohorts_made", label: "Cohorts Made" },
  { value: "participants", label: "Participants" },
  { value: "students", label: "Students" },
  { value: "open_cohorts", label: "Open Cohorts" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function createSectionId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultSectionData(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        tag: "About Digital Hub",
        title: "Practical Training For",
        highlight: "Career Outcomes",
        description: "",
        pills: ["Industry-led tracks", "Portfolio delivery", "Career support"],
        cta_primary_label: "Apply Now",
        cta_primary_link: "/apply",
        cta_secondary_label: "Browse Programs",
        cta_secondary_link: "/programs",
        image_url: "",
      };
    case "stats":
      return {
        items: [{ _id: createSectionId(), metric_key: "team_number", label: "Team Members", description: "", suffix: "+", prefix: "" }],
      };
    case "section_head":
      return { eyebrow: "Eyebrow", title: "Section title", description: "" };
    case "card_grid":
      return {
        title: "Card grid",
        cards: [{ _id: createSectionId(), title: "Feature", description: "", accent: "" }],
      };
    case "steps":
      return {
        title: "Journey",
        steps: [{ _id: createSectionId(), step_label: "Step 1", title: "Milestone", description: "" }],
      };
    case "table":
      return {
        caption: "",
        headers: ["Name", "Role"],
        rows: [{ Name: "", Role: "" }],
      };
    case "text_block":
      return { content: "", align: "left", font_size: "base" };
    case "image_full":
      return { image_url: "", caption: "", alt: "", max_width: "full" };
    case "two_col":
      return {
        left: { title: "", description: "", image_url: "" },
        right: { title: "", description: "", image_url: "" },
      };
    case "list":
      return { style: "bullet", title: "", items: ["First item", "Second item"] };
    case "spacer":
      return { height: "md" };
    default:
      return {};
  }
}

function createSection(type: SectionType): AboutSection {
  return {
    id: createSectionId(),
    type,
    enabled: true,
    bgColor: "",
    data: createDefaultSectionData(type),
  };
}

function normalizeSection(value: unknown): AboutSection | null {
  if (!isRecord(value)) return null;
  const type = str(value.type) as SectionType;
  if (!(type in SECTION_TYPE_LABELS)) return null;
  return {
    id: str(value.id, createSectionId()),
    type,
    enabled: value.enabled !== false,
    bgColor: str(value.bgColor),
    data: isRecord(value.data) ? value.data : {},
  };
}

function getSectionPreview(section: AboutSection): string {
  const data = section.data;
  switch (section.type) {
    case "hero":
      return [str(data.tag), str(data.title), str(data.highlight)].filter(Boolean).join(" · ") || "Hero banner";
    case "stats":
      return `${Array.isArray(data.items) ? data.items.length : 0} stat card(s)`;
    case "section_head":
      return str(data.title) || str(data.eyebrow) || "Section heading";
    case "card_grid":
      return str(data.title) || `${Array.isArray(data.cards) ? data.cards.length : 0} card(s)`;
    case "steps":
      return str(data.title) || `${Array.isArray(data.steps) ? data.steps.length : 0} step(s)`;
    case "table":
      return str(data.caption) || `${Array.isArray(data.headers) ? data.headers.length : 0} column(s)`;
    case "text_block":
      return str(data.content).slice(0, 100) || "Text block";
    case "image_full":
      return str(data.caption) || str(data.alt) || "Full-width image";
    case "two_col":
      return str((data.left as Record<string, unknown> | undefined)?.title) || str((data.right as Record<string, unknown> | undefined)?.title) || "Two columns";
    case "list":
      return str(data.title) || `${Array.isArray(data.items) ? data.items.length : 0} item(s)`;
    case "spacer":
      return `Spacer: ${str(data.height, "md")}`;
    default:
      return SECTION_TYPE_LABELS[section.type];
  }
}

function getSpacerHeight(height: string): string {
  switch (height) {
    case "sm":
      return "24px";
    case "lg":
      return "80px";
    case "xl":
      return "120px";
    default:
      return "48px";
  }
}

function getImageMaxWidth(value: string): string {
  switch (value) {
    case "sm":
      return "400px";
    case "md":
      return "640px";
    case "lg":
      return "860px";
    default:
      return "100%";
  }
}

function TopBar({ state, onSave }: { state: BuilderState; onSave: () => void }) {
  return (
    <div className="ab-topbar">
      <div className="ab-topbar__left">
        <span className="ab-topbar__title">About Page Builder</span>
        <span className="ab-topbar__hint">Click a section to edit · Reorder with the arrow buttons</span>
      </div>
      <div className="ab-topbar__right">
        {state.error ? <span className="ab-topbar__error">{state.error}</span> : null}
        {state.success ? <span className="ab-topbar__success">{state.success}</span> : null}
        <button
          className="ab-save-btn"
          type="button"
          onClick={onSave}
          disabled={state.saving || state.loading || !state.dirty}
        >
          {state.saving ? "Saving..." : state.dirty ? "Save Changes" : "No Changes"}
        </button>
        <span style={{ fontSize: "11px", color: "var(--text-muted, #718096)", marginLeft: "6px" }}>
          Saved content appears on the public site within ~60 seconds.
        </span>
      </div>
    </div>
  );
}

function AddBetweenButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="ab-add-between">
      <button className="ab-add-between__btn" type="button" onClick={onClick}>
        + Add Section
      </button>
    </div>
  );
}

function SectionCard({
  section,
  isActive,
  isFirst,
  isLast,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  onToggle,
}: {
  section: AboutSection;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const typeLabel = SECTION_TYPE_LABELS[section.type] ?? section.type;
  const preview = getSectionPreview(section);

  return (
    <div
      className={[
        "ab-section-card",
        isActive ? "ab-section-card--active" : "",
        !section.enabled ? "ab-section-card--hidden" : "",
      ].filter(Boolean).join(" ")}
      style={{ borderLeftColor: section.bgColor || SECTION_TYPE_ACCENTS[section.type] }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="ab-section-card__type">{typeLabel}</div>
      <div className="ab-section-card__preview">{preview}</div>
      <div className="ab-section-card__actions" onClick={(event) => event.stopPropagation()}>
        <button className="ab-icon-btn" type="button" onClick={onMoveUp} disabled={isFirst} title="Move up">↑</button>
        <button className="ab-icon-btn" type="button" onClick={onMoveDown} disabled={isLast} title="Move down">↓</button>
        <button
          className={`ab-icon-btn${!section.enabled ? " is-hidden" : ""}`}
          type="button"
          onClick={onToggle}
          title={section.enabled ? "Hide" : "Show"}
        >
          {section.enabled ? "○" : "●"}
        </button>
        {confirmDelete ? (
          <>
            <span className="ab-delete-confirm">Delete?</span>
            <button className="ab-icon-btn ab-icon-btn--danger" type="button" onClick={onDelete}>Yes</button>
            <button className="ab-icon-btn" type="button" onClick={() => setConfirmDelete(false)}>No</button>
          </>
        ) : (
          <button className="ab-icon-btn ab-icon-btn--del" type="button" onClick={() => setConfirmDelete(true)} title="Delete">✕</button>
        )}
      </div>
    </div>
  );
}

function AddSectionMenu({ onSelect, onClose }: { onSelect: (type: SectionType) => void; onClose: () => void }) {
  return (
    <div className="ab-add-menu-overlay" onClick={onClose}>
      <div className="ab-add-menu" onClick={(event) => event.stopPropagation()}>
        <div className="ab-add-menu__header">
          <span>Add section</span>
          <button className="ab-icon-btn" type="button" onClick={onClose}>✕</button>
        </div>
        <div className="ab-add-menu__grid">
          {SECTION_TYPE_CATALOG.map((item) => (
            <button
              key={item.type}
              className="ab-add-menu__item"
              type="button"
              onClick={() => onSelect(item.type)}
            >
              <span className="ab-add-menu__item-icon">{item.icon}</span>
              <span className="ab-add-menu__item-label">{item.label}</span>
              <span className="ab-add-menu__item-desc">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Canvas({
  sections,
  activeId,
  onSelect,
  onMove,
  onDelete,
  onToggle,
  onOpenAdd,
  addMenuIndex,
  onSelectAddType,
  onCloseAddMenu,
}: {
  sections: AboutSection[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onOpenAdd: (index: number) => void;
  addMenuIndex: number | null;
  onSelectAddType: (type: SectionType) => void;
  onCloseAddMenu: () => void;
}) {
  return (
    <div className="ab-canvas">
      <AddBetweenButton onClick={() => onOpenAdd(0)} />
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          <SectionCard
            section={section}
            isActive={section.id === activeId}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
            onSelect={() => onSelect(section.id)}
            onMoveUp={() => onMove(section.id, "up")}
            onMoveDown={() => onMove(section.id, "down")}
            onDelete={() => onDelete(section.id)}
            onToggle={() => onToggle(section.id)}
          />
          <AddBetweenButton onClick={() => onOpenAdd(index + 1)} />
        </Fragment>
      ))}
      {sections.length === 0 ? (
        <div className="ab-canvas__empty">
          <p>No sections yet.</p>
          <button className="ab-add-btn" type="button" onClick={() => onOpenAdd(0)}>
            + Add first section
          </button>
        </div>
      ) : null}
      {addMenuIndex !== null ? <AddSectionMenu onSelect={onSelectAddType} onClose={onCloseAddMenu} /> : null}
    </div>
  );
}

function EmptyPanel() {
  return (
    <aside className="ab-empty-panel">
      <div className="ab-empty-panel__inner">
        <h3>Section properties</h3>
        <p>Select a section from the canvas to edit its fields, colors, and content.</p>
      </div>
    </aside>
  );
}

function PropField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ab-props__field">
      <label className="ab-props__field-label">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder = "",
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const input = (
    <input
      className="ab-text-input"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
  return label ? <PropField label={label}>{input}</PropField> : input;
}

function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder = "",
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  label?: string;
}) {
  const textarea = (
    <textarea
      className="ab-textarea"
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
  return label ? <PropField label={label}>{textarea}</PropField> : textarea;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <PropField label={label}>
      <div className="ab-color-row">
        <input
          type="color"
          className="ab-color-input"
          value={value || "#4361ee"}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          type="text"
          className="ab-text-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#4361ee"
        />
      </div>
    </PropField>
  );
}

function ImageField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(file);
      });
      const match = /^data:(image\/[^;]+);base64,(.+)$/.exec(dataUrl);
      if (!match) {
        throw new Error("Unsupported file type.");
      }
      const result = await api<{ public_url: string }>("/cms/media", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          mime_type: match[1],
          data_base64: match[2],
        }),
      });
      onChange(result.public_url);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const inner = (
    <div className="ab-image-field">
      {value ? (
        <img
          src={value}
          alt=""
          className="ab-image-field__preview"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <input
        className="ab-text-input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://... or upload below"
      />
      <label className="ab-upload-btn">
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => void handleUpload(event)} disabled={uploading} />
        {uploading ? "Uploading..." : "Upload image"}
      </label>
    </div>
  );

  return label ? <PropField label={label}>{inner}</PropField> : inner;
}

function ItemListEditor({
  label,
  items,
  onChange,
  renderItem,
  defaultItem,
}: {
  label: string;
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  renderItem: (item: Record<string, unknown>, updateItem: (field: string, value: unknown) => void, index: number) => ReactNode;
  defaultItem: Record<string, unknown>;
}) {
  const addItem = () => onChange([...items, { ...defaultItem, _id: createSectionId() }]);
  const removeItem = (index: number) => onChange(items.filter((_, currentIndex) => currentIndex !== index));
  const moveItem = (index: number, dir: "up" | "down") => {
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const updateItem = (index: number, field: string, value: unknown) => {
    onChange(items.map((item, currentIndex) => (currentIndex === index ? { ...item, [field]: value } : item)));
  };

  return (
    <div className="ab-item-list">
      <div className="ab-item-list__header">
        <span className="ab-props__section-label">{label}</span>
        <button className="ab-add-item-btn" type="button" onClick={addItem}>+ Add</button>
      </div>
      {items.map((item, index) => (
        <div key={str(item._id, String(index))} className="ab-item-list__item">
          <div className="ab-item-list__item-controls">
            <button className="ab-icon-btn" type="button" onClick={() => moveItem(index, "up")} disabled={index === 0}>↑</button>
            <button className="ab-icon-btn" type="button" onClick={() => moveItem(index, "down")} disabled={index === items.length - 1}>↓</button>
            <span className="ab-item-list__item-num">#{index + 1}</span>
            <button className="ab-icon-btn ab-icon-btn--del" type="button" onClick={() => removeItem(index)}>✕</button>
          </div>
          {renderItem(item, (field: string, value: unknown) => updateItem(index, field, value), index)}
        </div>
      ))}
      {items.length === 0 ? <p className="ab-item-list__empty">No items. Click "+ Add" to start.</p> : null}
    </div>
  );
}

function TableRowEditor({
  headers,
  rows,
  onChange,
}: {
  headers: string[];
  rows: Record<string, string>[];
  onChange: (rows: Record<string, string>[]) => void;
}) {
  const addRow = () => onChange([...rows, Object.fromEntries(headers.map((header) => [header, ""]))]);
  const removeRow = (index: number) => onChange(rows.filter((_, currentIndex) => currentIndex !== index));
  const updateCell = (rowIdx: number, col: string, value: string) => {
    onChange(rows.map((row, index) => (index === rowIdx ? { ...row, [col]: value } : row)));
  };

  return (
    <div className="ab-table-editor">
      {headers.length === 0 ? <p className="ab-item-list__empty">Define column headers above first.</p> : null}
      {rows.map((row, index) => (
        <div key={`${index}-${headers.join("-")}`} className="ab-table-editor__row">
          <span className="ab-item-list__item-num">Row {index + 1}</span>
          {headers.map((header) => (
            <input
              key={`${index}-${header}`}
              className="ab-text-input"
              type="text"
              value={String(row[header] ?? "")}
              onChange={(event) => updateCell(index, header, event.target.value)}
              placeholder={header}
            />
          ))}
          <button className="ab-icon-btn ab-icon-btn--del" type="button" onClick={() => removeRow(index)}>✕</button>
        </div>
      ))}
      <button className="ab-add-item-btn" type="button" onClick={addRow}>+ Add row</button>
    </div>
  );
}

function SectionFields({ section, update }: SectionFieldProps) {
  const data = section.data;

  switch (section.type) {
    case "hero":
      return (
        <>
          <PropField label="Tag / eyebrow">
            <TextInput value={str(data.tag)} onChange={(value) => update("tag", value)} placeholder="About Digital Hub" />
          </PropField>
          <PropField label="Title — main text">
            <TextInput value={str(data.title)} onChange={(value) => update("title", value)} />
          </PropField>
          <PropField label="Title — highlighted words">
            <TextInput value={str(data.highlight)} onChange={(value) => update("highlight", value)} />
          </PropField>
          <PropField label="Description">
            <TextArea value={str(data.description)} onChange={(value) => update("description", value)} rows={3} />
          </PropField>
          <PropField label="Pills (one per line)">
            <TextArea
              value={Array.isArray(data.pills) ? (data.pills as string[]).join("\n") : str(data.pills)}
              onChange={(value) => update("pills", value.split("\n").map((entry) => entry.trim()).filter(Boolean))}
              rows={4}
              placeholder={"Industry-led tracks\nPortfolio delivery\nCareer support"}
            />
          </PropField>
          <PropField label="Primary button label">
            <TextInput value={str(data.cta_primary_label, "Apply Now")} onChange={(value) => update("cta_primary_label", value)} />
          </PropField>
          <PropField label="Primary button link">
            <TextInput value={str(data.cta_primary_link, "/apply")} onChange={(value) => update("cta_primary_link", value)} />
          </PropField>
          <PropField label="Secondary button label">
            <TextInput value={str(data.cta_secondary_label, "Browse Programs")} onChange={(value) => update("cta_secondary_label", value)} />
          </PropField>
          <PropField label="Secondary button link">
            <TextInput value={str(data.cta_secondary_link, "/programs")} onChange={(value) => update("cta_secondary_link", value)} />
          </PropField>
          <PropField label="Hero image URL">
            <ImageField value={str(data.image_url)} onChange={(value) => update("image_url", value)} />
          </PropField>
        </>
      );
    case "stats":
      return (
        <ItemListEditor
          label="Stat cards"
          items={Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : []}
          onChange={(items) => update("items", items)}
          renderItem={(item, updateItem) => (
            <>
              <PropField label="Metric key">
                <select className="ab-select" value={str(item.metric_key, "team_number")} onChange={(event) => updateItem("metric_key", event.target.value)}>
                  {METRIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </PropField>
              <TextInput label="Label" value={str(item.label)} onChange={(value) => updateItem("label", value)} />
              <TextInput label="Description" value={str(item.description)} onChange={(value) => updateItem("description", value)} />
              <TextInput label="Suffix (+)" value={str(item.suffix, "+")} onChange={(value) => updateItem("suffix", value)} />
              <TextInput label="Prefix" value={str(item.prefix)} onChange={(value) => updateItem("prefix", value)} />
            </>
          )}
          defaultItem={{ metric_key: "team_number", label: "Metric", description: "", suffix: "+", prefix: "" }}
        />
      );
    case "section_head":
      return (
        <>
          <PropField label="Eyebrow"><TextInput value={str(data.eyebrow)} onChange={(value) => update("eyebrow", value)} /></PropField>
          <PropField label="Title"><TextInput value={str(data.title)} onChange={(value) => update("title", value)} /></PropField>
          <PropField label="Description"><TextArea value={str(data.description)} onChange={(value) => update("description", value)} rows={3} /></PropField>
        </>
      );
    case "card_grid":
      return (
        <>
          <PropField label="Section title"><TextInput value={str(data.title)} onChange={(value) => update("title", value)} /></PropField>
          <ItemListEditor
            label="Cards"
            items={Array.isArray(data.cards) ? (data.cards as Record<string, unknown>[]) : []}
            onChange={(cards) => update("cards", cards)}
            renderItem={(item, updateItem) => (
              <>
                <TextInput label="Title" value={str(item.title)} onChange={(value) => updateItem("title", value)} />
                <TextArea label="Description" value={str(item.description)} onChange={(value) => updateItem("description", value)} rows={2} />
                <ColorField label="Accent color" value={str(item.accent)} onChange={(value) => updateItem("accent", value)} />
              </>
            )}
            defaultItem={{ title: "Feature", description: "", accent: "" }}
          />
        </>
      );
    case "steps":
      return (
        <>
          <PropField label="Section title"><TextInput value={str(data.title)} onChange={(value) => update("title", value)} /></PropField>
          <ItemListEditor
            label="Steps"
            items={Array.isArray(data.steps) ? (data.steps as Record<string, unknown>[]) : []}
            onChange={(steps) => update("steps", steps)}
            renderItem={(item, updateItem, index) => (
              <>
                <TextInput label="Step label" value={str(item.step_label, `Step ${index + 1}`)} onChange={(value) => updateItem("step_label", value)} />
                <TextInput label="Title" value={str(item.title)} onChange={(value) => updateItem("title", value)} />
                <TextArea label="Description" value={str(item.description)} onChange={(value) => updateItem("description", value)} rows={2} />
              </>
            )}
            defaultItem={{ step_label: "", title: "", description: "" }}
          />
        </>
      );
    case "table":
      return (
        <>
          <PropField label="Caption"><TextInput value={str(data.caption)} onChange={(value) => update("caption", value)} placeholder="Optional table title" /></PropField>
          <PropField label="Column headers (one per line)">
            <TextArea
              value={Array.isArray(data.headers) ? (data.headers as string[]).join("\n") : ""}
              onChange={(value) => update("headers", value.split("\n").map((entry) => entry.trim()).filter(Boolean))}
              rows={3}
              placeholder={"Name\nRole\nStatus"}
            />
          </PropField>
          <PropField label="Rows">
            <TableRowEditor
              headers={Array.isArray(data.headers) ? (data.headers as string[]) : []}
              rows={Array.isArray(data.rows) ? (data.rows as Record<string, string>[]) : []}
              onChange={(rows) => update("rows", rows)}
            />
          </PropField>
        </>
      );
    case "text_block":
      return (
        <>
          <PropField label="Content">
            <TextArea value={str(data.content)} onChange={(value) => update("content", value)} rows={8} placeholder="Enter text. Use line breaks for paragraphs." />
          </PropField>
          <PropField label="Text alignment">
            <select className="ab-select" value={str(data.align, "left")} onChange={(event) => update("align", event.target.value)}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </PropField>
          <PropField label="Font size">
            <select className="ab-select" value={str(data.font_size, "base")} onChange={(event) => update("font_size", event.target.value)}>
              <option value="sm">Small</option>
              <option value="base">Normal</option>
              <option value="lg">Large</option>
              <option value="xl">Extra large</option>
            </select>
          </PropField>
        </>
      );
    case "image_full":
      return (
        <>
          <PropField label="Image"><ImageField value={str(data.image_url)} onChange={(value) => update("image_url", value)} /></PropField>
          <PropField label="Caption"><TextInput value={str(data.caption)} onChange={(value) => update("caption", value)} /></PropField>
          <PropField label="Alt text"><TextInput value={str(data.alt)} onChange={(value) => update("alt", value)} /></PropField>
          <PropField label="Max width">
            <select className="ab-select" value={str(data.max_width, "full")} onChange={(event) => update("max_width", event.target.value)}>
              <option value="full">Full width</option>
              <option value="lg">Large (860px)</option>
              <option value="md">Medium (640px)</option>
              <option value="sm">Small (400px)</option>
            </select>
          </PropField>
        </>
      );
    case "two_col": {
      const left = isRecord(data.left) ? data.left : {};
      const right = isRecord(data.right) ? data.right : {};
      return (
        <>
          <div className="ab-props__section">
            <span className="ab-props__section-label">Left column</span>
            <TextInput label="Title" value={str(left.title)} onChange={(value) => update("left", { ...left, title: value })} />
            <TextArea label="Description" value={str(left.description)} onChange={(value) => update("left", { ...left, description: value })} rows={3} />
            <ImageField label="Image URL" value={str(left.image_url)} onChange={(value) => update("left", { ...left, image_url: value })} />
          </div>
          <div className="ab-props__section">
            <span className="ab-props__section-label">Right column</span>
            <TextInput label="Title" value={str(right.title)} onChange={(value) => update("right", { ...right, title: value })} />
            <TextArea label="Description" value={str(right.description)} onChange={(value) => update("right", { ...right, description: value })} rows={3} />
            <ImageField label="Image URL" value={str(right.image_url)} onChange={(value) => update("right", { ...right, image_url: value })} />
          </div>
        </>
      );
    }
    case "list":
      return (
        <>
          <PropField label="Title"><TextInput value={str(data.title)} onChange={(value) => update("title", value)} /></PropField>
          <PropField label="Style">
            <div className="ab-radio-group">
              {["bullet", "numbered", "checkmark"].map((styleOption) => (
                <label key={styleOption} className="ab-radio-label">
                  <input
                    type="radio"
                    name={`list-style-${section.id}`}
                    value={styleOption}
                    checked={str(data.style, "bullet") === styleOption}
                    onChange={() => update("style", styleOption)}
                  />
                  {styleOption.charAt(0).toUpperCase() + styleOption.slice(1)}
                </label>
              ))}
            </div>
          </PropField>
          <PropField label="Items (one per line)">
            <TextArea
              value={Array.isArray(data.items) ? (data.items as string[]).join("\n") : ""}
              onChange={(value) => update("items", value.split("\n").map((entry) => entry.trim()).filter(Boolean))}
              rows={6}
              placeholder={"First item\nSecond item\nThird item"}
            />
          </PropField>
        </>
      );
    case "spacer":
      return (
        <PropField label="Height">
          <select className="ab-select" value={str(data.height, "md")} onChange={(event) => update("height", event.target.value)}>
            <option value="sm">Small (24px)</option>
            <option value="md">Medium (48px)</option>
            <option value="lg">Large (80px)</option>
            <option value="xl">Extra large (120px)</option>
          </select>
        </PropField>
      );
    default:
      return null;
  }
}

function PropertiesPanel({
  section,
  onChange,
  onClose,
}: {
  section: AboutSection;
  onChange: (sectionId: string, field: string, value: unknown) => void;
  onClose: () => void;
}) {
  const update = (field: string, value: unknown) => {
    onChange(section.id, field, value);
  };

  return (
    <aside className="ab-props">
      <div className="ab-props__header">
        <span className="ab-props__title">{SECTION_TYPE_LABELS[section.type]}</span>
        <button className="ab-icon-btn" type="button" onClick={onClose} title="Close panel">✕</button>
      </div>

      <div className="ab-props__section">
        <span className="ab-props__section-label">Background</span>
        <div className="ab-color-row">
          <input
            type="color"
            className="ab-color-input"
            value={section.bgColor || "#ffffff"}
            onChange={(event) => onChange(section.id, "__bgColor", event.target.value)}
          />
          <input
            type="text"
            className="ab-text-input"
            value={section.bgColor}
            onChange={(event) => onChange(section.id, "__bgColor", event.target.value)}
            placeholder="#ffffff or transparent"
          />
          {section.bgColor ? (
            <button className="ab-icon-btn" type="button" onClick={() => onChange(section.id, "__bgColor", "")} title="Clear">✕</button>
          ) : null}
        </div>
      </div>

      <SectionFields section={section} update={update} />
    </aside>
  );
}

function BuilderPreview({ section }: { section: AboutSection }) {
  const data = section.data;
  const style = section.bgColor ? { background: section.bgColor } : undefined;

  switch (section.type) {
    case "hero":
      return (
        <div className="ab-preview ab-preview--hero" style={style}>
          <span className="ab-preview__eyebrow">{str(data.tag, "About Digital Hub")}</span>
          <h2>{str(data.title, "Practical Training For")} <span>{str(data.highlight, "Career Outcomes")}</span></h2>
          <p>{str(data.description, "Describe the hero section here.")}</p>
        </div>
      );
    case "stats":
      return (
        <div className="ab-preview ab-preview--stats" style={style}>
          {(Array.isArray(data.items) ? data.items as Record<string, unknown>[] : []).map((item, index) => (
            <div key={str(item._id, String(index))} className="ab-preview__stat">
              <strong>{str(item.prefix)}99{str(item.suffix, "+")}</strong>
              <span>{str(item.label, "Metric")}</span>
            </div>
          ))}
        </div>
      );
    case "section_head":
      return (
        <div className="ab-preview ab-preview--head" style={style}>
          <span className="ab-preview__eyebrow">{str(data.eyebrow, "Eyebrow")}</span>
          <h3>{str(data.title, "Section title")}</h3>
          <p>{str(data.description, "Section description.")}</p>
        </div>
      );
    case "card_grid":
      return (
        <div className="ab-preview ab-preview--grid" style={style}>
          <h3>{str(data.title, "Card grid")}</h3>
          <div className="ab-preview__grid">
            {(Array.isArray(data.cards) ? data.cards as Record<string, unknown>[] : []).map((card, index) => (
              <article key={str(card._id, String(index))} className="ab-preview__card" style={{ borderTopColor: str(card.accent) || undefined }}>
                <h4>{str(card.title, "Card")}</h4>
                <p>{str(card.description, "Description")}</p>
              </article>
            ))}
          </div>
        </div>
      );
    case "steps":
      return (
        <div className="ab-preview ab-preview--steps" style={style}>
          <h3>{str(data.title, "Journey")}</h3>
          <div className="ab-preview__steps">
            {(Array.isArray(data.steps) ? data.steps as Record<string, unknown>[] : []).map((step, index) => (
              <div key={str(step._id, String(index))} className="ab-preview__step">
                <span>{str(step.step_label, `Step ${index + 1}`)}</span>
                <strong>{str(step.title, "Milestone")}</strong>
              </div>
            ))}
          </div>
        </div>
      );
    case "table": {
      const headers = Array.isArray(data.headers) ? data.headers as string[] : [];
      const rows = Array.isArray(data.rows) ? data.rows as Record<string, string>[] : [];
      return (
        <div className="ab-preview ab-preview--table" style={style}>
          {str(data.caption) ? <h3>{str(data.caption)}</h3> : null}
          <div className="ab-preview__table-wrap">
            <table>
              <thead>
                <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((header) => <td key={`${rowIndex}-${header}`}>{String(row[header] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case "text_block":
      return (
        <div className={`ab-preview ab-preview--text is-${str(data.align, "left")} is-${str(data.font_size, "base")}`} style={style}>
          {str(data.content, "Text block content.").split("\n").map((line, index) => (
            <p key={index}>{line || "\u00A0"}</p>
          ))}
        </div>
      );
    case "image_full":
      return (
        <div className="ab-preview ab-preview--image" style={style}>
          {str(data.image_url) ? (
            <img
              src={str(data.image_url)}
              alt={str(data.alt)}
              style={{ maxWidth: getImageMaxWidth(str(data.max_width, "full")) }}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="ab-preview__image-placeholder">No image selected</div>
          )}
          {str(data.caption) ? <p>{str(data.caption)}</p> : null}
        </div>
      );
    case "two_col": {
      const left = isRecord(data.left) ? data.left : {};
      const right = isRecord(data.right) ? data.right : {};
      return (
        <div className="ab-preview ab-preview--two-col" style={style}>
          {[left, right].map((column, index) => (
            <article key={index} className="ab-preview__two-col-card">
              {str(column.image_url) ? (
                <img
                  src={str(column.image_url)}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <h4>{str(column.title, index === 0 ? "Left column" : "Right column")}</h4>
              <p>{str(column.description, "Column description")}</p>
            </article>
          ))}
        </div>
      );
    }
    case "list": {
      const items = Array.isArray(data.items) ? data.items as string[] : [];
      const styleType = str(data.style, "bullet");
      return (
        <div className="ab-preview ab-preview--list" style={style}>
          {str(data.title) ? <h3>{str(data.title)}</h3> : null}
          <ul className={`ab-preview__list ab-preview__list--${styleType}`}>
            {items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      );
    }
    case "spacer":
      return (
        <div className="ab-preview ab-preview--spacer" style={{ ...style, minHeight: getSpacerHeight(str(data.height, "md")) }}>
          <span>{SECTION_TYPE_LABELS.spacer}</span>
        </div>
      );
    default:
      return null;
  }
}

export function AboutBuilderPage() {
  const [state, setState] = useState<BuilderState>(INITIAL_STATE);
  const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pageContentRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null, success: null }));

    apiList<CmsPageRow>("/cms/pages?page=1&limit=200")
      .then((result) => {
        if (!active) return;
        const aboutPage = result.data.find((page) => page.key === "about") ?? null;
        if (!aboutPage) {
          pageContentRef.current = {};
          setState((prev) => ({
            ...prev,
            loading: false,
            pageId: null,
            sections: [],
            error: 'Create a page with the key "about" in CMS > Pages first.',
          }));
          return;
        }
        const content = isRecord(aboutPage.content) ? aboutPage.content : {};
        pageContentRef.current = content;
        const savedSections = Array.isArray(content.__builder_sections)
          ? (content.__builder_sections as unknown[]).map(normalizeSection).filter((section): section is AboutSection => Boolean(section))
          : [];

        setState((prev) => ({
          ...prev,
          loading: false,
          pageId: aboutPage.id,
          sections: savedSections,
          dirty: false,
          error: null,
        }));
      })
      .catch((err) => {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load.",
        }));
      });

    return () => {
      active = false;
    };
  }, []);

  const activeSection = useMemo(
    () => state.sections.find((section) => section.id === activeId) ?? null,
    [activeId, state.sections],
  );

  const handleChange = useCallback((sectionId: string, field: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      dirty: true,
      sections: prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        if (field === "__bgColor") {
          return { ...section, bgColor: String(value) };
        }
        return { ...section, data: { ...section.data, [field]: value } };
      }),
    }));
  }, []);

  const handleMove = useCallback((sectionId: string, dir: "up" | "down") => {
    setState((prev) => {
      const index = prev.sections.findIndex((section) => section.id === sectionId);
      const target = dir === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= prev.sections.length) return prev;
      const next = [...prev.sections];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, sections: next, dirty: true };
    });
  }, []);

  const handleDelete = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
      dirty: true,
    }));
    setActiveId((prev) => (prev === sectionId ? null : prev));
  }, []);

  const handleToggle = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      dirty: true,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, enabled: !section.enabled } : section,
      ),
    }));
  }, []);

  const handleOpenAdd = useCallback((index: number) => {
    setAddMenuIndex(index);
  }, []);

  const handleSelectAddType = useCallback((type: SectionType) => {
    setState((prev) => {
      const nextSection = createSection(type);
      const insertAt = addMenuIndex ?? prev.sections.length;
      const nextSections = [...prev.sections];
      nextSections.splice(insertAt, 0, nextSection);
      setActiveId(nextSection.id);
      return {
        ...prev,
        dirty: true,
        sections: nextSections,
      };
    });
    setAddMenuIndex(null);
  }, [addMenuIndex]);

  const handleSave = useCallback(async () => {
    if (!state.pageId) return;
    setState((prev) => ({ ...prev, saving: true, error: null, success: null }));

    try {
      await api(`/cms/pages/${state.pageId}`, {
        method: "PATCH",
        body: JSON.stringify({
          content: {
            ...pageContentRef.current,
            __builder_sections: state.sections,
            __builder_version: 1,
          },
        }),
      });
      pageContentRef.current = {
        ...pageContentRef.current,
        __builder_sections: state.sections,
        __builder_version: 1,
      };
      setState((prev) => ({ ...prev, saving: false, dirty: false, success: "Saved!" }));
      window.setTimeout(() => {
        setState((prev) => ({ ...prev, success: null }));
      }, 3000);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : "Save failed.",
      }));
    }
  }, [state.pageId, state.sections]);

  return (
    <PageShell>
      <div className="ab-page">
        <TopBar state={state} onSave={() => void handleSave()} />
        {!state.loading && state.pageId === null ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 24px",
            gap: "12px",
            textAlign: "center",
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M8 7h8M8 11h8M8 15h5" />
              <circle cx="18" cy="18" r="4" fill="var(--surface)" stroke="var(--danger)" />
              <path d="M18 16v2M18 20v.5" stroke="var(--danger)" strokeWidth="1.8" />
            </svg>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
              No "about" page found in the CMS
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0, maxWidth: "360px" }}>
              Create a page with the key <code style={{ background: "var(--surface-soft)", padding: "1px 6px", borderRadius: "4px", fontFamily: "monospace" }}>about</code> in{" "}
              <strong>CMS → Pages</strong> first, then return here to build the About page layout.
            </p>
          </div>
        ) : (
          <div className="ab-layout">
            <Canvas
              sections={state.sections}
              activeId={activeId}
              onSelect={setActiveId}
              onMove={handleMove}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onOpenAdd={handleOpenAdd}
              addMenuIndex={addMenuIndex}
              onSelectAddType={handleSelectAddType}
              onCloseAddMenu={() => setAddMenuIndex(null)}
            />
            <div className="ab-side">
              {activeSection ? (
                <PropertiesPanel
                  key={activeSection.id}
                  section={activeSection}
                  onChange={handleChange}
                  onClose={() => setActiveId(null)}
                />
              ) : (
                <EmptyPanel />
              )}
            </div>
          </div>
        )}
        <div className="ab-preview-pane">
          <div className="ab-preview-pane__header">
            <span className="ab-preview-pane__title">Selected section preview</span>
            <span className="ab-preview-pane__hint">This is a lightweight builder preview.</span>
          </div>
          {activeSection ? (
            <BuilderPreview section={activeSection} />
          ) : (
            <div className="ab-preview ab-preview--empty">
              <p>Select a section to preview it here.</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
