import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { PageShell } from "../../../components/PageShell";
import { api, apiList } from "../../../utils/api";
import "../../../styles/about-builder.css";

// ---------- Types ----------

type MetricCard = {
  _id: string;
  metric_key: string;
  label: string;
  description: string;
  prefix: string;
  suffix: string;
  value_override: string;
};

type KpiCard = {
  _id: string;
  metric_key: string;
  label: string;
  description: string;
  prefix: string;
  suffix: string;
  value_override: string;
};

type FocusCard = {
  _id: string;
  title: string;
  description: string;
};

type JourneyCard = {
  _id: string;
  step: string;
  title: string;
  description: string;
};

type AboutContent = {
  // Page banner
  banner_title: string;
  banner_subtitle: string;
  // Hero
  hero_tag: string;
  hero_title_primary: string;
  hero_title_highlight: string;
  hero_subtitle: string;
  hero_pills: string[];
  hero_image_url: string;
  primary_cta_text: string;
  primary_cta_link: string;
  secondary_cta_text: string;
  secondary_cta_link: string;
  // Stats
  metric_cards: MetricCard[];
  // Outcomes
  outcomes_eyebrow: string;
  outcomes_title: string;
  outcomes_description: string;
  outcome_kpi_cards: KpiCard[];
  // Programs
  programs_eyebrow: string;
  programs_title: string;
  programs_description: string;
  program_names_limit: number;
  program_names: string[];
  // Focus
  focus_eyebrow: string;
  focus_title: string;
  focus_description: string;
  focus_cards: FocusCard[];
  // Journey
  journey_eyebrow: string;
  journey_title: string;
  journey_description: string;
  journey_cards: JourneyCard[];
};

type CmsPageRow = {
  id: number;
  key: string;
  title: string | null;
  content: Record<string, unknown> | null;
  is_published: boolean;
  updated_at: string;
};

type PageState = {
  pageId: number | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  dirty: boolean;
};

// ---------- Constants ----------

const METRIC_KEY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Auto-detect from label" },
  { value: "team_number", label: "Team Members (live)" },
  { value: "programs", label: "Programs (live)" },
  { value: "cohorts_made", label: "Cohorts Made (live)" },
  { value: "participants", label: "Participants (live)" },
  { value: "students", label: "Students (live)" },
  { value: "open_cohorts", label: "Open Cohorts (live)" },
];

const DEFAULT_CONTENT: AboutContent = {
  banner_title: "Build skills. Become employable.",
  banner_subtitle: "About Us",
  hero_tag: "About Digital Hub",
  hero_title_primary: "Practical Training For",
  hero_title_highlight: "Career Outcomes",
  hero_subtitle:
    "Digital Hub helps learners move from theory to execution through project-based programs, hands-on mentorship, and structured support.",
  hero_pills: ["Industry-led tracks", "Portfolio-focused delivery", "Career readiness support"],
  hero_image_url: "",
  primary_cta_text: "Apply Now",
  primary_cta_link: "/apply",
  secondary_cta_text: "Browse Programs",
  secondary_cta_link: "/programs",
  metric_cards: [],
  outcomes_eyebrow: "How We Measure Outcomes",
  outcomes_title: "Delivery Metrics",
  outcomes_description: "These KPI cards are calculated from live platform data and tracked continuously.",
  outcome_kpi_cards: [],
  programs_eyebrow: "Programs",
  programs_title: "Program Names",
  programs_description: "Current programs delivered across the Digital Hub learning model.",
  program_names_limit: 8,
  program_names: [],
  focus_eyebrow: "What We Deliver",
  focus_title: "How The Learning Experience Works",
  focus_description:
    "Our model combines technical depth, mentor support, and clear execution standards so learners build real momentum.",
  focus_cards: [],
  journey_eyebrow: "Mission In Action",
  journey_title: "From Learning To Delivery",
  journey_description: "Every step is designed to move participants from core skills to real project execution.",
  journey_cards: [],
};

// ---------- Helpers ----------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => (typeof item === "string" ? item : "")).filter((item) => item.length > 0);
}

function createId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeMetricCard(value: unknown): MetricCard {
  const record = isRecord(value) ? value : {};
  return {
    _id: str(record._id, createId()),
    metric_key: str(record.metric_key ?? record.metricKey),
    label: str(record.label ?? record.title),
    description: str(record.description ?? record.text),
    prefix: str(record.prefix),
    suffix: str(record.suffix, "+"),
    value_override: str(record.value_override ?? record.valueOverride),
  };
}

function normalizeKpiCard(value: unknown): KpiCard {
  return normalizeMetricCard(value);
}

function normalizeFocusCard(value: unknown): FocusCard {
  const record = isRecord(value) ? value : {};
  return {
    _id: str(record._id, createId()),
    title: str(record.title),
    description: str(record.description ?? record.text),
  };
}

function normalizeJourneyCard(value: unknown): JourneyCard {
  const record = isRecord(value) ? value : {};
  return {
    _id: str(record._id, createId()),
    step: str(record.step ?? record.step_label ?? record.stepLabel),
    title: str(record.title),
    description: str(record.description ?? record.text),
  };
}

function contentFromCms(content: Record<string, unknown>): AboutContent {
  const metricCardsRaw = Array.isArray(content.metric_cards)
    ? content.metric_cards
    : Array.isArray(content.metricCards)
      ? content.metricCards
      : [];
  const kpiRaw = Array.isArray(content.outcome_kpi_cards)
    ? content.outcome_kpi_cards
    : Array.isArray(content.outcomeKpiCards)
      ? content.outcomeKpiCards
      : [];
  const focusRaw = Array.isArray(content.focus_cards)
    ? content.focus_cards
    : Array.isArray(content.focusCards)
      ? content.focusCards
      : [];
  const journeyRaw = Array.isArray(content.journey_cards)
    ? content.journey_cards
    : Array.isArray(content.journeyCards)
      ? content.journeyCards
      : [];

  return {
    banner_title: str(content.banner_title ?? content.bannerTitle, DEFAULT_CONTENT.banner_title),
    banner_subtitle: str(content.banner_subtitle ?? content.bannerSubtitle, DEFAULT_CONTENT.banner_subtitle),
    hero_tag: str(content.hero_tag ?? content.heroTag, DEFAULT_CONTENT.hero_tag),
    hero_title_primary: str(content.hero_title_primary ?? content.heroTitlePrimary, DEFAULT_CONTENT.hero_title_primary),
    hero_title_highlight: str(
      content.hero_title_highlight ?? content.heroTitleHighlight,
      DEFAULT_CONTENT.hero_title_highlight,
    ),
    hero_subtitle: str(content.hero_subtitle ?? content.heroSubtitle, DEFAULT_CONTENT.hero_subtitle),
    hero_pills: stringArray(content.hero_pills ?? content.heroPills, DEFAULT_CONTENT.hero_pills),
    hero_image_url: str(content.hero_image_url ?? content.heroImageUrl),
    primary_cta_text: str(content.primary_cta_text ?? content.primaryCtaText, DEFAULT_CONTENT.primary_cta_text),
    primary_cta_link: str(content.primary_cta_link ?? content.primaryCtaLink, DEFAULT_CONTENT.primary_cta_link),
    secondary_cta_text: str(content.secondary_cta_text ?? content.secondaryCtaText, DEFAULT_CONTENT.secondary_cta_text),
    secondary_cta_link: str(content.secondary_cta_link ?? content.secondaryCtaLink, DEFAULT_CONTENT.secondary_cta_link),

    metric_cards: metricCardsRaw.map(normalizeMetricCard),

    outcomes_eyebrow: str(content.outcomes_eyebrow ?? content.outcomesEyebrow, DEFAULT_CONTENT.outcomes_eyebrow),
    outcomes_title: str(content.outcomes_title ?? content.outcomesTitle, DEFAULT_CONTENT.outcomes_title),
    outcomes_description: str(
      content.outcomes_description ?? content.outcomesDescription,
      DEFAULT_CONTENT.outcomes_description,
    ),
    outcome_kpi_cards: kpiRaw.map(normalizeKpiCard),

    programs_eyebrow: str(content.programs_eyebrow ?? content.programsEyebrow, DEFAULT_CONTENT.programs_eyebrow),
    programs_title: str(content.programs_title ?? content.programsTitle, DEFAULT_CONTENT.programs_title),
    programs_description: str(
      content.programs_description ?? content.programsDescription,
      DEFAULT_CONTENT.programs_description,
    ),
    program_names_limit: num(content.program_names_limit ?? content.programNamesLimit, DEFAULT_CONTENT.program_names_limit),
    program_names: stringArray(content.program_names ?? content.programNames, DEFAULT_CONTENT.program_names),

    focus_eyebrow: str(content.focus_eyebrow ?? content.focusEyebrow, DEFAULT_CONTENT.focus_eyebrow),
    focus_title: str(content.focus_title ?? content.focusTitle, DEFAULT_CONTENT.focus_title),
    focus_description: str(content.focus_description ?? content.focusDescription, DEFAULT_CONTENT.focus_description),
    focus_cards: focusRaw.map(normalizeFocusCard),

    journey_eyebrow: str(content.journey_eyebrow ?? content.journeyEyebrow, DEFAULT_CONTENT.journey_eyebrow),
    journey_title: str(content.journey_title ?? content.journeyTitle, DEFAULT_CONTENT.journey_title),
    journey_description: str(
      content.journey_description ?? content.journeyDescription,
      DEFAULT_CONTENT.journey_description,
    ),
    journey_cards: journeyRaw.map(normalizeJourneyCard),
  };
}

function contentToCms(content: AboutContent): Record<string, unknown> {
  const stripIds = <T extends { _id: string }>(items: T[]): Array<Omit<T, "_id">> =>
    items.map((item) => {
      const { _id: _unused, ...rest } = item;
      return rest;
    });

  return {
    banner_title: content.banner_title,
    banner_subtitle: content.banner_subtitle,
    hero_tag: content.hero_tag,
    hero_title_primary: content.hero_title_primary,
    hero_title_highlight: content.hero_title_highlight,
    hero_subtitle: content.hero_subtitle,
    hero_pills: content.hero_pills,
    hero_image_url: content.hero_image_url,
    primary_cta_text: content.primary_cta_text,
    primary_cta_link: content.primary_cta_link,
    secondary_cta_text: content.secondary_cta_text,
    secondary_cta_link: content.secondary_cta_link,
    metric_cards: stripIds(content.metric_cards),
    outcomes_eyebrow: content.outcomes_eyebrow,
    outcomes_title: content.outcomes_title,
    outcomes_description: content.outcomes_description,
    outcome_kpi_cards: stripIds(content.outcome_kpi_cards),
    programs_eyebrow: content.programs_eyebrow,
    programs_title: content.programs_title,
    programs_description: content.programs_description,
    program_names_limit: content.program_names_limit,
    program_names: content.program_names,
    focus_eyebrow: content.focus_eyebrow,
    focus_title: content.focus_title,
    focus_description: content.focus_description,
    focus_cards: stripIds(content.focus_cards),
    journey_eyebrow: content.journey_eyebrow,
    journey_title: content.journey_title,
    journey_description: content.journey_description,
    journey_cards: stripIds(content.journey_cards),
  };
}

// ---------- UI primitives ----------

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="ab-props__field">
      <span className="ab-props__field-label">{label}</span>
      {children}
      {hint ? <span className="ab-field-hint">{hint}</span> : null}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      className="ab-text-input"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      className="ab-textarea"
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      className="ab-text-input"
      value={value}
      min={min}
      max={max}
      onChange={(event) => {
        const parsed = Number(event.target.value);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select className="ab-select" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
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
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
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
      {uploadError ? <span className="ab-topbar__error">{uploadError}</span> : null}
    </div>
  );
}

function StringListEditor({
  items,
  onChange,
  itemPlaceholder,
  addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  itemPlaceholder?: string;
  addLabel?: string;
}) {
  const updateAt = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };
  const removeAt = (index: number) => onChange(items.filter((_, i) => i !== index));
  const moveAt = (index: number, dir: "up" | "down") => {
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="ab-item-list">
      {items.length === 0 ? <span className="ab-item-list__empty">No items yet.</span> : null}
      {items.map((item, index) => (
        <div key={`${index}-${item.slice(0, 8)}`} className="ab-item-list__inline-row">
          <input
            type="text"
            className="ab-text-input"
            value={item}
            placeholder={itemPlaceholder}
            onChange={(event) => updateAt(index, event.target.value)}
          />
          <div className="ab-item-list__item-controls">
            <button
              type="button"
              className="ab-icon-btn"
              onClick={() => moveAt(index, "up")}
              disabled={index === 0}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="ab-icon-btn"
              onClick={() => moveAt(index, "down")}
              disabled={index === items.length - 1}
              aria-label="Move down"
            >
              ↓
            </button>
            <button type="button" className="ab-icon-btn ab-icon-btn--del" onClick={() => removeAt(index)} aria-label="Remove">
              ×
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="ab-add-item-btn" onClick={() => onChange([...items, ""])}>
        + {addLabel ?? "Add item"}
      </button>
    </div>
  );
}

function CardListEditor<T extends { _id: string }>({
  items,
  onChange,
  renderItem,
  createItem,
  addLabel,
  itemLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, updateItem: (patch: Partial<T>) => void, index: number) => ReactNode;
  createItem: () => T;
  addLabel: string;
  itemLabel: (item: T, index: number) => string;
}) {
  const updateItem = (index: number, patch: Partial<T>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));
  const moveItem = (index: number, dir: "up" | "down") => {
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="ab-item-list">
      {items.length === 0 ? <span className="ab-item-list__empty">No cards yet.</span> : null}
      {items.map((item, index) => (
        <div key={item._id} className="ab-item-list__item">
          <div className="ab-item-list__header">
            <span className="ab-item-list__item-num">{itemLabel(item, index)}</span>
            <div className="ab-item-list__item-controls">
              <button
                type="button"
                className="ab-icon-btn"
                onClick={() => moveItem(index, "up")}
                disabled={index === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="ab-icon-btn"
                onClick={() => moveItem(index, "down")}
                disabled={index === items.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button type="button" className="ab-icon-btn ab-icon-btn--del" onClick={() => removeItem(index)} aria-label="Remove">
                Delete
              </button>
            </div>
          </div>
          <div className="ab-item-list__body">{renderItem(item, (patch) => updateItem(index, patch), index)}</div>
        </div>
      ))}
      <button type="button" className="ab-add-item-btn" onClick={() => onChange([...items, createItem()])}>
        + {addLabel}
      </button>
    </div>
  );
}

function Panel({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`ab-panel${open ? " is-open" : ""}`}>
      <button type="button" className="ab-panel__header" onClick={() => setOpen((prev) => !prev)} aria-expanded={open}>
        <div className="ab-panel__heading">
          <span className="ab-panel__title">{title}</span>
          {description ? <span className="ab-panel__desc">{description}</span> : null}
        </div>
        <span className="ab-panel__chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? <div className="ab-panel__body">{children}</div> : null}
    </section>
  );
}

function TopBar({ state, onSave }: { state: PageState; onSave: () => void }) {
  return (
    <div className="ab-topbar">
      <div className="ab-topbar__left">
        <span className="ab-topbar__title">About Page Builder</span>
        <span className="ab-topbar__hint">Edit the content of the public /about page. Changes appear within ~60 seconds of saving.</span>
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
      </div>
    </div>
  );
}

// ---------- Card renderers ----------

function renderMetricFields(item: MetricCard, update: (patch: Partial<MetricCard>) => void) {
  return (
    <>
      <Field label="Label">
        <TextInput value={item.label} onChange={(value) => update({ label: value })} placeholder="e.g. Team Members" />
      </Field>
      <Field label="Description">
        <Textarea value={item.description} onChange={(value) => update({ description: value })} rows={2} />
      </Field>
      <Field label="Metric source" hint="Picks which live number to display. Auto-detect infers from the label.">
        <SelectInput value={item.metric_key} onChange={(value) => update({ metric_key: value })} options={METRIC_KEY_OPTIONS} />
      </Field>
      <div className="ab-two-col">
        <Field label="Prefix">
          <TextInput value={item.prefix} onChange={(value) => update({ prefix: value })} placeholder="e.g. $" />
        </Field>
        <Field label="Suffix">
          <TextInput value={item.suffix} onChange={(value) => update({ suffix: value })} placeholder="e.g. +" />
        </Field>
      </div>
      <Field label="Value override" hint="Leave empty to use the live number.">
        <TextInput
          value={item.value_override}
          onChange={(value) => update({ value_override: value })}
          placeholder="e.g. 500"
        />
      </Field>
    </>
  );
}

function renderFocusFields(item: FocusCard, update: (patch: Partial<FocusCard>) => void) {
  return (
    <>
      <Field label="Title">
        <TextInput value={item.title} onChange={(value) => update({ title: value })} />
      </Field>
      <Field label="Description">
        <Textarea value={item.description} onChange={(value) => update({ description: value })} rows={3} />
      </Field>
    </>
  );
}

function renderJourneyFields(item: JourneyCard, update: (patch: Partial<JourneyCard>) => void) {
  return (
    <>
      <Field label="Step label">
        <TextInput value={item.step} onChange={(value) => update({ step: value })} placeholder="e.g. Step 01" />
      </Field>
      <Field label="Title">
        <TextInput value={item.title} onChange={(value) => update({ title: value })} />
      </Field>
      <Field label="Description">
        <Textarea value={item.description} onChange={(value) => update({ description: value })} rows={3} />
      </Field>
    </>
  );
}

// ---------- Main page ----------

export function AboutBuilderPage() {
  const [state, setState] = useState<PageState>({
    pageId: null,
    loading: true,
    saving: false,
    error: null,
    success: null,
    dirty: false,
  });
  const [content, setContent] = useState<AboutContent>(DEFAULT_CONTENT);
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
          setContent(DEFAULT_CONTENT);
          setState((prev) => ({
            ...prev,
            loading: false,
            pageId: null,
            error: 'Create a page with the key "about" in CMS > Pages first.',
          }));
          return;
        }
        const pageContent = isRecord(aboutPage.content) ? aboutPage.content : {};
        pageContentRef.current = pageContent;
        setContent(contentFromCms(pageContent));
        setState((prev) => ({
          ...prev,
          loading: false,
          pageId: aboutPage.id,
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

  useEffect(() => {
    if (!state.dirty) return undefined;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.dirty]);

  const patch = useCallback(<K extends keyof AboutContent>(key: K, value: AboutContent[K]) => {
    setContent((prev) => ({ ...prev, [key]: value }));
    setState((prev) => ({ ...prev, dirty: true, success: null }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!state.pageId) return;
    setState((prev) => ({ ...prev, saving: true, error: null, success: null }));

    try {
      const cmsFields = contentToCms(content);
      const nextContent = {
        ...pageContentRef.current,
        ...cmsFields,
      };
      await api(`/cms/pages/${state.pageId}`, {
        method: "PATCH",
        body: JSON.stringify({ content: nextContent }),
      });
      pageContentRef.current = nextContent;
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
  }, [state.pageId, content]);

  return (
    <PageShell>
      <div className="ab-page">
        <TopBar state={state} onSave={() => void handleSave()} />

        {state.loading ? (
          <div className="ab-empty-panel">
            <div className="ab-empty-panel__inner">
              <h3>Loading...</h3>
              <p>Fetching the about page from CMS.</p>
            </div>
          </div>
        ) : state.pageId === null ? (
          <div className="ab-empty-panel">
            <div className="ab-empty-panel__inner">
              <h3>No "about" page found in the CMS</h3>
              <p>
                Create a page with the key <code>about</code> in <strong>CMS → Pages</strong> first, then return here to edit content.
              </p>
            </div>
          </div>
        ) : (
          <div className="ab-panels">
            <Panel
              title="Page Banner"
              description="The breadcrumb banner at the very top of the page - title and sub-label visible on all screen sizes."
              defaultOpen
            >
              <Field label="Banner title">
                <TextInput
                  value={content.banner_title}
                  onChange={(value) => patch("banner_title", value)}
                  placeholder="Build skills. Become employable."
                />
              </Field>
              <Field label="Banner sub-label" hint="Shown in the breadcrumb nav path, e.g. 'About Us'.">
                <TextInput
                  value={content.banner_subtitle}
                  onChange={(value) => patch("banner_subtitle", value)}
                  placeholder="About Us"
                />
              </Field>
            </Panel>

            <Panel title="Hero" description="Top banner with title, pills, image, and CTAs." defaultOpen>
              <Field label="Tag">
                <TextInput value={content.hero_tag} onChange={(value) => patch("hero_tag", value)} />
              </Field>
              <Field label="Title (primary part)">
                <TextInput
                  value={content.hero_title_primary}
                  onChange={(value) => patch("hero_title_primary", value)}
                />
              </Field>
              <Field label="Title (highlighted part)" hint="Rendered with the blue highlight.">
                <TextInput
                  value={content.hero_title_highlight}
                  onChange={(value) => patch("hero_title_highlight", value)}
                />
              </Field>
              <Field label="Subtitle">
                <Textarea
                  value={content.hero_subtitle}
                  onChange={(value) => patch("hero_subtitle", value)}
                  rows={3}
                />
              </Field>
              <Field label="Pills" hint="Short tags displayed under the subtitle.">
                <StringListEditor
                  items={content.hero_pills}
                  onChange={(next) => patch("hero_pills", next)}
                  itemPlaceholder="Pill label"
                  addLabel="Add pill"
                />
              </Field>
              <Field label="Hero image">
                <ImageField value={content.hero_image_url} onChange={(value) => patch("hero_image_url", value)} />
              </Field>
              <div className="ab-two-col">
                <Field label="Primary CTA text">
                  <TextInput
                    value={content.primary_cta_text}
                    onChange={(value) => patch("primary_cta_text", value)}
                  />
                </Field>
                <Field label="Primary CTA link">
                  <TextInput
                    value={content.primary_cta_link}
                    onChange={(value) => patch("primary_cta_link", value)}
                    placeholder="/apply"
                  />
                </Field>
              </div>
              <div className="ab-two-col">
                <Field label="Secondary CTA text">
                  <TextInput
                    value={content.secondary_cta_text}
                    onChange={(value) => patch("secondary_cta_text", value)}
                  />
                </Field>
                <Field label="Secondary CTA link">
                  <TextInput
                    value={content.secondary_cta_link}
                    onChange={(value) => patch("secondary_cta_link", value)}
                    placeholder="/programs"
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Stats row" description="Summary metric cards shown under the hero.">
              <CardListEditor
                items={content.metric_cards}
                onChange={(next) => patch("metric_cards", next)}
                renderItem={(item, update) => renderMetricFields(item, update)}
                createItem={() => ({
                  _id: createId(),
                  metric_key: "",
                  label: "",
                  description: "",
                  prefix: "",
                  suffix: "+",
                  value_override: "",
                })}
                addLabel="Add metric card"
                itemLabel={(item, index) => item.label || `Metric ${index + 1}`}
              />
            </Panel>

            <Panel title="Outcomes section" description="Section heading + KPI cards.">
              <Field label="Eyebrow">
                <TextInput value={content.outcomes_eyebrow} onChange={(value) => patch("outcomes_eyebrow", value)} />
              </Field>
              <Field label="Title">
                <TextInput value={content.outcomes_title} onChange={(value) => patch("outcomes_title", value)} />
              </Field>
              <Field label="Description">
                <Textarea
                  value={content.outcomes_description}
                  onChange={(value) => patch("outcomes_description", value)}
                  rows={3}
                />
              </Field>
              <Field label="KPI cards">
                <CardListEditor
                  items={content.outcome_kpi_cards}
                  onChange={(next) => patch("outcome_kpi_cards", next)}
                  renderItem={(item, update) => renderMetricFields(item, update)}
                  createItem={() => ({
                    _id: createId(),
                    metric_key: "",
                    label: "",
                    description: "",
                    prefix: "",
                    suffix: "+",
                    value_override: "",
                  })}
                  addLabel="Add KPI card"
                  itemLabel={(item, index) => item.label || `KPI ${index + 1}`}
                />
              </Field>
            </Panel>

            <Panel title="Programs section" description="Section heading and program name list.">
              <Field label="Eyebrow">
                <TextInput value={content.programs_eyebrow} onChange={(value) => patch("programs_eyebrow", value)} />
              </Field>
              <Field label="Title">
                <TextInput value={content.programs_title} onChange={(value) => patch("programs_title", value)} />
              </Field>
              <Field label="Description">
                <Textarea
                  value={content.programs_description}
                  onChange={(value) => patch("programs_description", value)}
                  rows={3}
                />
              </Field>
              <Field label="Max program cards to show" hint="Between 1 and 24.">
                <NumberInput
                  value={content.program_names_limit}
                  onChange={(value) => patch("program_names_limit", value)}
                  min={1}
                  max={24}
                />
              </Field>
              <Field label="Program names (fallback)" hint="Live program titles from the database override this list if available.">
                <StringListEditor
                  items={content.program_names}
                  onChange={(next) => patch("program_names", next)}
                  itemPlaceholder="Program name"
                  addLabel="Add program name"
                />
              </Field>
            </Panel>

            <Panel title="Focus section" description="Feature cards for 'What We Deliver'.">
              <Field label="Eyebrow">
                <TextInput value={content.focus_eyebrow} onChange={(value) => patch("focus_eyebrow", value)} />
              </Field>
              <Field label="Title">
                <TextInput value={content.focus_title} onChange={(value) => patch("focus_title", value)} />
              </Field>
              <Field label="Description">
                <Textarea
                  value={content.focus_description}
                  onChange={(value) => patch("focus_description", value)}
                  rows={3}
                />
              </Field>
              <Field label="Focus cards">
                <CardListEditor
                  items={content.focus_cards}
                  onChange={(next) => patch("focus_cards", next)}
                  renderItem={(item, update) => renderFocusFields(item, update)}
                  createItem={() => ({ _id: createId(), title: "", description: "" })}
                  addLabel="Add focus card"
                  itemLabel={(item, index) => item.title || `Focus ${index + 1}`}
                />
              </Field>
            </Panel>

            <Panel title="Journey section" description="Step cards for the learner journey.">
              <Field label="Eyebrow">
                <TextInput value={content.journey_eyebrow} onChange={(value) => patch("journey_eyebrow", value)} />
              </Field>
              <Field label="Title">
                <TextInput value={content.journey_title} onChange={(value) => patch("journey_title", value)} />
              </Field>
              <Field label="Description">
                <Textarea
                  value={content.journey_description}
                  onChange={(value) => patch("journey_description", value)}
                  rows={3}
                />
              </Field>
              <Field label="Journey steps">
                <CardListEditor
                  items={content.journey_cards}
                  onChange={(next) => patch("journey_cards", next)}
                  renderItem={(item, update) => renderJourneyFields(item, update)}
                  createItem={() => ({ _id: createId(), step: "", title: "", description: "" })}
                  addLabel="Add journey step"
                  itemLabel={(item, index) => item.title || item.step || `Step ${index + 1}`}
                />
              </Field>
            </Panel>
          </div>
        )}
      </div>
    </PageShell>
  );
}
