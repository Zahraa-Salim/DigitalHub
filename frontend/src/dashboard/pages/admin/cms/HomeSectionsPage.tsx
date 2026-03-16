// File: frontend/src/dashboard/pages/admin/CmsHomeSectionsPage.tsx
// Purpose: Renders the admin CMS home sections page page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Card } from "../../../components/Card";
import { CmsMediaPickerModal, type CmsMediaAsset } from "../../../components/CmsMediaPickerModal";
import { PageShell } from "../../../components/PageShell";
import { ToastStack } from "../../../components/ToastStack";
import { useDashboardToasts } from "../../../hooks/useDashboardToasts";
import { ApiError, api, apiList } from "../../../utils/api";

type JsonObject = Record<string, unknown>;

type HomeSectionRow = {
  id: number;
  key: string;
  title: string | null;
  is_enabled: boolean;
  sort_order: number;
  content: JsonObject | null;
  updated_at: string;
};

type HomeSectionEditor = {
  id: number;
  key: string;
  title: string;
  isEnabled: boolean;
  sortOrder: number;
  contentText: string;
};

type SectionKind =
  | "hero"
  | "announcements"
  | "about"
  | "programs"
  | "featured_participants"
  | "newsletter"
  | "instructors"
  | "features"
  | "apply_cta"
  | "generic";

type FieldType = "text" | "textarea" | "number" | "checkbox" | "lines";
type FieldDefault = string | number | boolean | string[];
type StructuredField = {
  path: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  aliases?: string[];
  defaultValue?: FieldDefault;
};
type RepeaterConfig = {
  path: string;
  label: string;
  itemLabel: string;
  defaultItem: JsonObject;
  fields: StructuredField[];
};
type SectionConfig = { fields: StructuredField[]; repeaters?: RepeaterConfig[]; note?: string };
type SectionMeta = { title: string; websiteLocation: string };

const SECTION_KIND_ALIASES: Record<SectionKind, string[]> = {
  hero: ["hero", "banner", "home_banner"],
  announcements: ["announcements", "announcement_feed", "home_announcements"],
  about: ["about", "home_about"],
  programs: ["programs", "courses", "cohorts", "course_area"],
  featured_participants: ["featured_participants", "featured_participant", "participants_featured"],
  newsletter: ["newsletter", "subscribe"],
  instructors: ["instructors", "team", "featured_students"],
  features: ["features", "benefits", "journey"],
  apply_cta: ["apply_cta", "cta", "apply"],
  generic: [],
};

const SECTION_CONFIG: Record<SectionKind, SectionConfig> = {
  hero: {
    note: "These defaults match the current website hero content.",
    fields: [
      { path: "headline_prefix", label: "Headline Prefix", type: "text", defaultValue: "Build Your" },
      { path: "headline_highlight", label: "Headline Highlight", type: "text", aliases: ["headline"], defaultValue: "Digital Skills" },
      { path: "headline_suffix", label: "Headline Suffix", type: "text", defaultValue: "For Work, Freelancing, and" },
      { path: "headline_emphasis", label: "Headline Emphasis", type: "text", defaultValue: "the Digital Economy" },
      { path: "description", label: "Description", type: "textarea", aliases: ["subheadline"], defaultValue: "Programs designed to build skills and employability." },
      { path: "cta_text", label: "CTA Text", type: "text", defaultValue: "Explore Programs" },
      { path: "cta_link", label: "CTA Link", type: "text", defaultValue: "/programs" },
      { path: "badge_primary", label: "Badge Primary", type: "text", defaultValue: "Hands-on Training" },
      { path: "badge_secondary", label: "Badge Secondary", type: "text", defaultValue: "Mentorship & Projects" },
      { path: "background_image_url", label: "Background Image URL", type: "text", defaultValue: "banner_bg.png" },
      { path: "main_image_url", label: "Main Image URL", type: "text", defaultValue: "banner_img.png" },
      { path: "shape_big_image_url", label: "Shape Big Image URL", type: "text", defaultValue: "banner_shape01.png" },
      { path: "shape_dots_image_url", label: "Shape Dots Image URL", type: "text", defaultValue: "bg_dots.svg" },
      { path: "shape_small_image_url", label: "Shape Small Image URL", type: "text", defaultValue: "banner_shape02.png" },
      { path: "shape_line_image_url", label: "Shape Line Image URL", type: "text", defaultValue: "banner_shape01.svg" },
      { path: "shape_arrow_image_url", label: "Shape Arrow Image URL", type: "text", defaultValue: "banner_shape02.svg" },
    ],
  },
  announcements: {
    note: "This controls the home announcement section heading and the See More link. The website shows at most two cards on the homepage.",
    fields: [
      { path: "subtitle", label: "Section Subtitle", type: "text", aliases: ["sub_title"], defaultValue: "Latest Updates" },
      { path: "title", label: "Section Title", type: "text", aliases: ["heading"], defaultValue: "What Is Happening At The Digital Hub" },
      {
        path: "description",
        label: "Description",
        type: "textarea",
        aliases: ["body", "text"],
        defaultValue: "Track important updates across upcoming events, cohort announcements, and new opportunities published by the team.",
      },
      { path: "limit", label: "Max Cards On Home", type: "number", defaultValue: 2 },
      { path: "cta_text", label: "\"See More\" Button Text", type: "text", aliases: ["button_text"], defaultValue: "View All Updates" },
      { path: "cta_link", label: "\"See More\" Link", type: "text", aliases: ["button_link"], defaultValue: "/events#announcements" },
    ],
  },
  about: {
    fields: [
      { path: "subtitle", label: "Subtitle", type: "text", aliases: ["sub_title"], defaultValue: "About The Digital Hub" },
      { path: "title", label: "Title", type: "text", aliases: ["heading"], defaultValue: "Empowering Youth with Practical Digital Skills" },
      {
        path: "description",
        label: "Description",
        type: "textarea",
        aliases: ["text"],
        defaultValue:
          "The Digital Hub helps youth build practical digital skills through guided training, mentorship, and real projects that connect learning to work.",
      },
      {
        path: "bullet_points",
        label: "Bullet Points (one per line)",
        type: "lines",
        aliases: ["bullets"],
        defaultValue:
          "Job-ready web and digital training\nHands-on projects with mentor support\nCareer preparation for real opportunities",
      },
      { path: "cta_text", label: "CTA Text", type: "text", aliases: ["button_text"], defaultValue: "Learn More About Us" },
      { path: "cta_link", label: "CTA Link", type: "text", aliases: ["button_link"], defaultValue: "/about-us" },
      { path: "main_image_url", label: "Main Image URL", type: "text", defaultValue: "about_img.png" },
      { path: "shape_image_url", label: "Shape Image URL", type: "text", defaultValue: "about_shape.svg" },
    ],
  },
  programs: {
    fields: [
      { path: "subtitle", label: "Subtitle", type: "text", aliases: ["sub_title"] },
      { path: "title", label: "Title", type: "text", aliases: ["heading"] },
      { path: "description", label: "Description", type: "textarea" },
      { path: "limit", label: "Cards Limit", type: "number" },
      { path: "all_tab_label", label: "All Tab Label", type: "text" },
      { path: "empty_state_text", label: "Empty State Text", type: "text" },
      { path: "update_notice_text", label: "Update Notice Text", type: "text" },
      { path: "more_button_text", label: "More Button Text", type: "text" },
      { path: "more_button_link", label: "More Button Link", type: "text", defaultValue: "/programs" },
      { path: "show_status_tabs", label: "Show Status Tabs", type: "checkbox" },
      { path: "background_image_url", label: "Background Image URL", type: "text", defaultValue: "courses_bg.jpg" },
    ],
  },
  featured_participants: {
    fields: [
      { path: "subtitle", label: "Subtitle", type: "text", aliases: ["sub_title"], defaultValue: "Featured Participants" },
      { path: "title", label: "Title", type: "text", aliases: ["heading"], defaultValue: "Meet Active Participants Building Real Work" },
      {
        path: "description",
        label: "Description",
        type: "textarea",
        aliases: ["body", "text"],
        defaultValue: "Explore active students currently building projects, growing their skills, and contributing across Digital Hub programs.",
      },
      { path: "limit", label: "Cards Limit", type: "number", defaultValue: 3 },
      { path: "cta_text", label: "CTA Text", type: "text", aliases: ["button_text"], defaultValue: "View All Participants" },
      { path: "cta_link", label: "CTA Link", type: "text", aliases: ["button_link"], defaultValue: "/participants" },
    ],
  },
  newsletter: {
    fields: [
      { path: "title_prefix", label: "Title Prefix", type: "text" },
      { path: "title_highlight", label: "Title Highlight", type: "text" },
      { path: "title_suffix", label: "Title Suffix", type: "text" },
      { path: "title_second_line_prefix", label: "Second Line Prefix", type: "text" },
      { path: "title_second_line_highlight", label: "Second Line Highlight", type: "text" },
      { path: "input_placeholder", label: "Input Placeholder", type: "text" },
      { path: "button_text", label: "Button Text", type: "text" },
      { path: "main_image_url", label: "Main Image URL", type: "text", defaultValue: "newsletter_img.png" },
      { path: "shape_one_image_url", label: "Shape One Image URL", type: "text", defaultValue: "newsletter_shape01.png" },
      { path: "shape_two_image_url", label: "Shape Two Image URL", type: "text", defaultValue: "newsletter_shape02.png" },
      { path: "shape_bg_image_url", label: "Background Shape Image URL", type: "text", defaultValue: "newsletter_shape03.png" },
    ],
  },
  instructors: {
    note: "Use `source_mode = profiles` to render live Team profiles (managers + instructors). Use `custom` to use the cards list below.",
    fields: [
      { path: "subtitle", label: "Subtitle", type: "text", aliases: ["sub_title"] },
      { path: "title", label: "Title", type: "text", aliases: ["heading"] },
      { path: "description", label: "Description", type: "textarea" },
      { path: "cta_text", label: "CTA Text", type: "text", aliases: ["button_text"] },
      { path: "cta_link", label: "CTA Link", type: "text", aliases: ["button_link"] },
      { path: "limit", label: "Cards Limit", type: "number" },
      { path: "source_mode", label: "Cards Source (profiles/custom)", type: "text", defaultValue: "profiles" },
    ],
    repeaters: [
      {
        path: "cards",
        label: "Team Cards",
        itemLabel: "Card",
        defaultItem: {
          name: "",
          designation: "",
          image_url: "",
          profile_link: "/instructors",
          social: { linkedin: "", github: "", portfolio: "" },
        },
        fields: [
          { path: "name", label: "Name", type: "text" },
          { path: "designation", label: "Designation", type: "text" },
          { path: "image_url", label: "Image URL", type: "text" },
          { path: "profile_link", label: "Profile Link", type: "text" },
          { path: "social.linkedin", label: "LinkedIn URL", type: "text" },
          { path: "social.github", label: "GitHub URL", type: "text" },
          { path: "social.portfolio", label: "Portfolio URL", type: "text" },
        ],
      },
    ],
  },
  features: {
    fields: [
      { path: "subtitle", label: "Subtitle", type: "text", aliases: ["sub_title"] },
      { path: "title", label: "Title", type: "text", aliases: ["heading"] },
      { path: "description", label: "Description", type: "textarea", aliases: ["desc"] },
      { path: "limit", label: "Cards Limit", type: "number", defaultValue: 4 },
    ],
    repeaters: [
      {
        path: "items",
        label: "Feature Items",
        itemLabel: "Item",
        defaultItem: { title: "", description: "", icon_url: "" },
        fields: [
          { path: "title", label: "Title", type: "text" },
          { path: "description", label: "Description", type: "text" },
          { path: "icon_url", label: "Icon URL", type: "text" },
        ],
      },
    ],
  },
  apply_cta: {
    fields: [
      { path: "left.title", label: "Left Card Title", type: "text" },
      { path: "left.description", label: "Left Card Description", type: "text" },
      { path: "left.button_text", label: "Left Button Text", type: "text" },
      { path: "left.button_link", label: "Left Button Link", type: "text" },
      { path: "left.image_url", label: "Left Image URL", type: "text", defaultValue: "instructor_two01.png" },
      { path: "right.title", label: "Right Card Title", type: "text" },
      { path: "right.description", label: "Right Card Description", type: "text" },
      { path: "right.button_text", label: "Right Button Text", type: "text" },
      { path: "right.button_link", label: "Right Button Link", type: "text" },
      { path: "right.image_url", label: "Right Image URL", type: "text", defaultValue: "instructor_two02.png" },
    ],
  },
  generic: {
    fields: [],
    note: "No structured form is available for this key yet. Use Advanced JSON mode.",
  },
};

const SECTION_META: Record<SectionKind, SectionMeta> = {
  hero: { title: "Home Hero Section", websiteLocation: "Website > Home > Top hero banner" },
  announcements: { title: "Home Announcements Section", websiteLocation: "Website > Home > Updates section under hero" },
  about: { title: "Home About Section", websiteLocation: "Website > Home > About block" },
  programs: { title: "Home Programs Section", websiteLocation: "Website > Home > Programs list" },
  featured_participants: { title: "Home Featured Participants Section", websiteLocation: "Website > Home > Featured participants cards" },
  newsletter: { title: "Home Newsletter Section", websiteLocation: "Website > Home > Newsletter callout" },
  instructors: { title: "Home Team Section", websiteLocation: "Website > Home > Team cards" },
  features: { title: "Home Features Section", websiteLocation: "Website > Home > Features grid" },
  apply_cta: { title: "Home Apply CTA Section", websiteLocation: "Website > Home > Two apply cards" },
  generic: { title: "Custom Home Section", websiteLocation: "Website > Home position based on section key" },
};

const MEDIA_FIELD_PATTERN = /(image|icon|logo|avatar|photo|thumbnail|banner|background)/i;

const toJsonText = (value: unknown) => JSON.stringify(value ?? {}, null, 2);
const isRecord = (value: unknown): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const normalizeKey = (value: string) => String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
const toCamelSegment = (segment: string) => segment.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const toCamelPath = (path: string) => path.split(".").map(toCamelSegment).join(".");
const toPathList = (path: string | string[]) => (Array.isArray(path) ? path : [path]);
const uniquePaths = (paths: string[]) => [...new Set(paths.map((entry) => String(entry || "").trim()).filter(Boolean))];
const resolveReadPaths = (path: string, aliases: string[] = []) => uniquePaths([path, toCamelPath(path), ...aliases, ...aliases.map(toCamelPath)]);
const parseLineArray = (raw: string) => raw.split(/\r?\n/g).map((line) => line.trim()).filter(Boolean);
const toLineArrayText = (values: string[]) => values.join("\n");

const parseJsonObject = (text: string) => {
  try {
    const parsed = JSON.parse(text);
    if (!isRecord(parsed)) return { value: null as JsonObject | null, error: "Content JSON must be an object." };
    return { value: parsed, error: "" };
  } catch {
    return { value: null as JsonObject | null, error: "Content must be valid JSON." };
  }
};

const resolveSectionKind = (sectionKey: string): SectionKind => {
  const normalized = normalizeKey(sectionKey);
  const entries = Object.entries(SECTION_KIND_ALIASES) as Array<[SectionKind, string[]]>;
  for (const [kind, aliases] of entries) {
    if (kind === "generic") continue;
    if (aliases.includes(normalized)) return kind;
  }
  return "generic";
};

const getAtPath = (obj: JsonObject, path: string): unknown => {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
};

const getAtAnyPath = (obj: JsonObject, path: string | string[]): unknown => {
  for (const candidate of toPathList(path)) {
    const value = getAtPath(obj, candidate);
    if (value !== undefined) return value;
  }
  return undefined;
};

const setAtPath = (obj: JsonObject, path: string, value: unknown) => {
  const keys = path.split(".");
  let cursor: JsonObject = obj;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const isLast = i === keys.length - 1;
    if (isLast) {
      cursor[key] = value;
      return;
    }
    if (!isRecord(cursor[key])) cursor[key] = {};
    cursor = cursor[key] as JsonObject;
  }
};

const readString = (obj: JsonObject, path: string | string[], fallback = "") => {
  const value = getAtAnyPath(obj, path);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

const isMediaField = (field: StructuredField) => {
  if (field.type !== "text") return false;
  const path = `${field.path} ${(field.aliases ?? []).join(" ")}`.toLowerCase();
  const label = field.label.toLowerCase();
  return MEDIA_FIELD_PATTERN.test(path) || MEDIA_FIELD_PATTERN.test(label);
};

const formatCurrentValue = (value: string) => {
  const trimmed = String(value || "").trim();
  return trimmed || "Empty";
};

const readNumber = (obj: JsonObject, path: string | string[], fallback = 0) => {
  const value = getAtAnyPath(obj, path);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const readBoolean = (obj: JsonObject, path: string | string[], fallback = false) => {
  const value = getAtAnyPath(obj, path);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return fallback;
};

const readStringArray = (obj: JsonObject, path: string | string[]) => {
  const value = getAtAnyPath(obj, path);
  if (!Array.isArray(value)) return [] as string[];
  return value.map((entry) => (typeof entry === "string" ? entry.trim() : typeof entry === "number" || typeof entry === "boolean" ? String(entry) : "")).filter(Boolean);
};

const readRecordArray = (obj: JsonObject, path: string) => {
  const value = getAtPath(obj, path);
  if (!Array.isArray(value)) return [] as JsonObject[];
  return value.filter((entry): entry is JsonObject => isRecord(entry));
};

const buildEditor = (row: HomeSectionRow): HomeSectionEditor => ({
  id: row.id,
  key: String(row.key || ""),
  title: String(row.title ?? ""),
  isEnabled: Boolean(row.is_enabled),
  sortOrder: Number(row.sort_order ?? 0),
  contentText: toJsonText(row.content),
});

const SECTION_RENDER_PRIORITY: Record<SectionKind, number> = {
  hero: 0,
  announcements: 1,
  about: 2,
  programs: 3,
  featured_participants: 4,
  newsletter: 5,
  instructors: 6,
  features: 7,
  apply_cta: 8,
  generic: 99,
};

const sortHomeRows = (items: HomeSectionRow[]) =>
  [...items].sort((a, b) => {
    const sortDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    if (sortDiff !== 0) return sortDiff;
    const sectionDiff =
      SECTION_RENDER_PRIORITY[resolveSectionKind(a.key)] -
      SECTION_RENDER_PRIORITY[resolveSectionKind(b.key)];
    if (sectionDiff !== 0) return sectionDiff;
    return Number(a.id ?? 0) - Number(b.id ?? 0);
  });

const withSequentialSortOrder = (items: HomeSectionRow[]) =>
  items.map((item, index) => ({ ...item, sort_order: index + 1 }));

const reorderRows = (items: HomeSectionRow[], sourceId: number, targetId: number) => {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return withSequentialSortOrder(next);
};

export function CmsHomeSectionsPage() {
  const { toasts, pushToast, dismissToast } = useDashboardToasts();
  const [rows, setRows] = useState<HomeSectionRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editor, setEditor] = useState<HomeSectionEditor | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [savedSortOrder, setSavedSortOrder] = useState<Record<number, number>>({});
  const [mediaTargetPath, setMediaTargetPath] = useState<string | null>(null);

  const orderedRows = useMemo(() => sortHomeRows(rows), [rows]);
  const sectionKind = useMemo(() => resolveSectionKind(editor?.key ?? ""), [editor?.key]);
  const sectionConfig = SECTION_CONFIG[sectionKind];
  const sectionMeta = SECTION_META[sectionKind];
  const parsedContent = useMemo(() => (editor ? parseJsonObject(editor.contentText) : { value: null as JsonObject | null, error: "" }), [editor]);

  useEffect(() => {
    if (error) {
      pushToast("error", error);
    }
  }, [error, pushToast]);

  useEffect(() => {
    if (success) {
      pushToast("success", success);
    }
  }, [pushToast, success]);

  const loadSections = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiList<HomeSectionRow>("/cms/home-sections?page=1&limit=200&sortBy=sort_order&order=asc");
      const sortedRows = sortHomeRows(result.data);
      setRows(sortedRows);
      setSavedSortOrder(
        Object.fromEntries(sortedRows.map((row) => [row.id, Number(row.sort_order ?? 0)])),
      );
      setOrderDirty(false);
      setDraggedId(null);
      setDragOverId(null);
      const nextSelectedId = selectedId && sortedRows.some((row) => row.id === selectedId) ? selectedId : sortedRows[0]?.id ?? null;
      setSelectedId(nextSelectedId);
      const nextSelected = sortedRows.find((row) => row.id === nextSelectedId);
      setEditor(nextSelected ? buildEditor(nextSelected) : null);
      setJsonMode(nextSelected ? resolveSectionKind(nextSelected.key) === "generic" : false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message || "Failed to load home sections." : "Failed to load home sections.");
      setRows([]);
      setSelectedId(null);
      setEditor(null);
      setJsonMode(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (row: HomeSectionRow) => {
    setSelectedId(row.id);
    setEditor(buildEditor(row));
    setJsonMode(resolveSectionKind(row.key) === "generic");
    setSuccess("");
    setError("");
  };

  const handleTabDragStart = (event: DragEvent<HTMLButtonElement>, sectionId: number) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(sectionId));
    setDraggedId(sectionId);
    setDragOverId(sectionId);
  };

  const handleTabDragOver = (event: DragEvent<HTMLButtonElement>, sectionId: number) => {
    if (draggedId === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (sectionId !== draggedId) setDragOverId(sectionId);
  };

  const handleTabDrop = (event: DragEvent<HTMLButtonElement>, targetId: number) => {
    event.preventDefault();
    const rawSourceId = draggedId ?? Number(event.dataTransfer.getData("text/plain"));
    const sourceId = Number(rawSourceId);
    setDraggedId(null);
    setDragOverId(null);
    if (!Number.isFinite(sourceId) || sourceId === targetId) return;

    const nextRows = reorderRows(orderedRows, sourceId, targetId);
    if (nextRows.every((row, index) => row.id === orderedRows[index]?.id)) return;

    setRows(nextRows);
    setOrderDirty(true);
    setSuccess("");
    setError("");
    setEditor((prev) => {
      if (!prev) return prev;
      const updated = nextRows.find((row) => row.id === prev.id);
      if (!updated) return prev;
      return { ...prev, sortOrder: Number(updated.sort_order ?? prev.sortOrder) };
    });
  };

  const handleTabDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const updateContent = (mutator: (draft: JsonObject) => void) => {
    setEditor((prev) => {
      if (!prev) return prev;
      const parsed = parseJsonObject(prev.contentText);
      const draft = parsed.value ? JSON.parse(JSON.stringify(parsed.value)) as JsonObject : {};
      mutator(draft);
      return { ...prev, contentText: toJsonText(draft) };
    });
  };

  const setContentValue = (path: string, value: unknown) => updateContent((draft) => setAtPath(draft, path, value));
  const addArrayItem = (path: string, item: JsonObject) => updateContent((draft) => setAtPath(draft, path, [...readRecordArray(draft, path), item]));
  const updateArrayItem = (path: string, index: number, updater: (item: JsonObject) => void) =>
    updateContent((draft) => {
      const items = readRecordArray(draft, path);
      if (!items[index]) return;
      const next = { ...items[index] };
      updater(next);
      items[index] = next;
      setAtPath(draft, path, items);
    });
  const removeArrayItem = (path: string, index: number) =>
    updateContent((draft) => {
      const items = readRecordArray(draft, path);
      if (!items[index]) return;
      items.splice(index, 1);
      setAtPath(draft, path, items);
    });
  const handleMediaPick = (asset: CmsMediaAsset) => {
    if (!mediaTargetPath) return;
    setContentValue(mediaTargetPath, asset.public_url);
    setMediaTargetPath(null);
  };

  const saveSection = async () => {
    if (!editor) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const parsed = JSON.parse(editor.contentText) as Record<string, unknown>;
      if (sectionKind === "hero") {
        const legacyHeadline = String(parsed.headline ?? "").trim();
        if (!String(parsed.headline_highlight ?? "").trim() && legacyHeadline) {
          parsed.headline_highlight = legacyHeadline;
        }
      }
      await api<HomeSectionRow>(`/cms/home-sections/${editor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editor.title.trim() || null,
          is_enabled: editor.isEnabled,
          sort_order: Number.isFinite(editor.sortOrder) ? Math.trunc(editor.sortOrder) : 0,
          content: parsed,
        }),
      });
      setSuccess("Home section saved successfully.");
      await loadSections();
    } catch (err) {
      if (err instanceof SyntaxError) setError("Content must be valid JSON.");
      else setError(err instanceof ApiError ? err.message || "Failed to save home section." : "Failed to save home section.");
    } finally {
      setSaving(false);
    }
  };

  const saveTabOrder = async () => {
    if (!orderDirty || orderSaving) return;
    setOrderSaving(true);
    setError("");
    setSuccess("");
    try {
      const ordered = sortHomeRows(rows);
      const updates = ordered
        .map((row, index) => ({ id: row.id, sort_order: index + 1 }))
        .filter((entry) => savedSortOrder[entry.id] !== entry.sort_order);

      if (updates.length === 0) {
        setOrderDirty(false);
        setSuccess("Tab order is already saved.");
        return;
      }

      await Promise.all(
        updates.map((entry) =>
          api<HomeSectionRow>(`/cms/home-sections/${entry.id}`, {
            method: "PATCH",
            body: JSON.stringify({ sort_order: entry.sort_order }),
          }),
        ),
      );
      setSuccess("Tab order saved successfully.");
      await loadSections();
    } catch (err) {
      setError(err instanceof ApiError ? err.message || "Failed to save tab order." : "Failed to save tab order.");
    } finally {
      setOrderSaving(false);
    }
  };

  const renderField = (field: StructuredField, content: JsonObject, keyPrefix = "root", scopePath = "") => {
    const path = scopePath ? `${scopePath}.${field.path}` : field.path;
    const aliasedPaths = (field.aliases ?? []).map((aliasPath) => (scopePath ? `${scopePath}.${aliasPath}` : aliasPath));
    const readPaths = resolveReadPaths(path, aliasedPaths);
    const key = `${keyPrefix}:${path}`;
    const defaultValue = field.defaultValue;
    if (field.type === "checkbox") {
      const current = readBoolean(content, readPaths, typeof defaultValue === "boolean" ? defaultValue : false);
      return (
        <label key={key} className="toggle-wrap">
          <input
            type="checkbox"
            checked={current}
            onChange={(event) => setContentValue(path, event.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    }
    if (field.type === "textarea") {
      const current = readString(content, readPaths, typeof defaultValue === "string" ? defaultValue : "");
      return (
        <label key={key} className="field">
          <span className="field__label">{field.label}</span>
          <textarea
            className="textarea-control"
            value={current}
            onChange={(event) => setContentValue(path, event.target.value)}
            placeholder={field.placeholder}
          />
          <span className="field__hint">Current value: {formatCurrentValue(current)}</span>
        </label>
      );
    }
    if (field.type === "number") {
      const current = readNumber(content, readPaths, typeof defaultValue === "number" ? defaultValue : 0);
      return (
        <label key={key} className="field">
          <span className="field__label">{field.label}</span>
          <input
            className="field__control"
            type="number"
            value={current}
            onChange={(event) => setContentValue(path, Number(event.target.value || 0))}
            placeholder={field.placeholder}
          />
          <span className="field__hint">Current value: {String(current)}</span>
        </label>
      );
    }
    if (field.type === "lines") {
      const current = toLineArrayText(
        readStringArray(content, readPaths).length
          ? readStringArray(content, readPaths)
          : Array.isArray(defaultValue)
            ? defaultValue.filter((entry): entry is string => typeof entry === "string")
            : [],
      );
      return (
        <label key={key} className="field">
          <span className="field__label">{field.label}</span>
          <textarea
            className="textarea-control"
            value={current}
            onChange={(event) => setContentValue(path, parseLineArray(event.target.value))}
            placeholder={field.placeholder}
          />
          <span className="field__hint">Current value: {formatCurrentValue(current)}</span>
        </label>
      );
    }
    const current = readString(content, readPaths, typeof defaultValue === "string" ? defaultValue : "");
    const mediaField = isMediaField(field);
    return (
      <label key={key} className="field">
        <span className="field__label">{field.label}</span>
        <div className="cms-field-inline">
          <input
            className="field__control"
            value={current}
            onChange={(event) => setContentValue(path, event.target.value)}
            placeholder={field.placeholder}
          />
          {mediaField ? (
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setMediaTargetPath(path)}>
              Media Library
            </button>
          ) : null}
        </div>
        <span className="field__hint">Current value: {formatCurrentValue(current)}</span>
      </label>
    );
  };

  const renderStructuredEditor = () => {
    if (!editor) return null;
    if (parsedContent.error) {
      return (
        <div className="form-stack">
          <p className="field__error">{parsedContent.error}</p>
          <div className="cms-home-editor__actions-row">
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setJsonMode(true)}>Open JSON Editor</button>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setEditor((prev) => (prev ? { ...prev, contentText: toJsonText({}) } : prev))}>Reset Content</button>
          </div>
        </div>
      );
    }
    if (sectionKind === "generic") return <p className="info-text info-text--small">{sectionConfig.note}</p>;

    const content = parsedContent.value ?? {};
    return (
      <div className="form-stack">
        {sectionConfig.note ? <p className="info-text info-text--small">{sectionConfig.note}</p> : null}
        <div className="cms-home-editor__grid">{sectionConfig.fields.map((field) => renderField(field, content))}</div>
        {sectionConfig.repeaters?.map((repeater) => {
          const items = readRecordArray(content, repeater.path);
          return (
            <div key={repeater.path} className="cms-home-editor__group">
              <div className="cms-home-editor__group-head">
                <p className="info-text">{repeater.label}</p>
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => addArrayItem(repeater.path, repeater.defaultItem)}>Add {repeater.itemLabel}</button>
              </div>
              {items.length === 0 ? (
                <p className="info-text info-text--small">No items configured yet.</p>
              ) : (
                <div className="cms-home-editor__array">
                  {items.map((_item, index) => (
                    <div key={`${repeater.path}-${index}`} className="cms-home-editor__array-item">
                      <div className="cms-home-editor__array-head">
                        <strong>{repeater.itemLabel} {index + 1}</strong>
                        <button className="btn btn--secondary btn--sm" type="button" onClick={() => removeArrayItem(repeater.path, index)}>Remove</button>
                      </div>
                      <div className="cms-home-editor__grid">
                        {repeater.fields.map((field) => {
                          const scopedField: StructuredField = { ...field, path: `${repeater.path}.${index}.${field.path}` };
                          const current = readString(content, resolveReadPaths(scopedField.path, []));
                          const mediaField = isMediaField(field);
                          return (
                            <label key={`${repeater.path}-${index}-${field.path}`} className="field">
                              <span className="field__label">{field.label}</span>
                              <div className="cms-field-inline">
                                <input
                                  className="field__control"
                                  value={current}
                                  onChange={(event) => updateArrayItem(repeater.path, index, (target) => setAtPath(target, field.path, event.target.value))}
                                />
                                {mediaField ? (
                                  <button className="btn btn--secondary btn--sm" type="button" onClick={() => setMediaTargetPath(scopedField.path)}>
                                    Media Library
                                  </button>
                                ) : null}
                              </div>
                              <span className="field__hint">Current value: {formatCurrentValue(current)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageShell title="Home Sections" subtitle="Edit homepage section order, visibility, and content with structured fields.">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <Card>
        <div className="cms-home-sections-toolbar">
          <div className="cms-home-sections-tabs" role="tablist" aria-label="Home sections">
            {orderedRows.map((row) => (
              <button
                key={row.id}
                type="button"
                role="tab"
                aria-selected={selectedId === row.id}
                draggable
                className={`cms-home-sections-tab ${selectedId === row.id ? "is-active" : ""} ${row.is_enabled ? "is-enabled" : "is-disabled"} ${draggedId === row.id ? "is-dragging" : ""} ${draggedId !== row.id && dragOverId === row.id ? "is-drop-target" : ""}`}
                onClick={() => handleSelect(row)}
                onDragStart={(event) => handleTabDragStart(event, row.id)}
                onDragOver={(event) => handleTabDragOver(event, row.id)}
                onDrop={(event) => handleTabDrop(event, row.id)}
                onDragEnd={handleTabDragEnd}
              >
                {row.title || row.key}
              </button>
            ))}
          </div>
          <div className="cms-home-sections-toolbar__actions">
            <span className="info-text info-text--small">Drag tabs to reorder, then save.</span>
            <button
              type="button"
              className={`btn btn--sm ${orderDirty ? "btn--primary" : "btn--secondary"}`}
              onClick={saveTabOrder}
              disabled={!orderDirty || orderSaving || loading || saving}
            >
              {orderSaving ? "Saving order..." : "Save Tab Order"}
            </button>
          </div>
        </div>
        {!editor ? (
          <div className="empty-state">
            <p className="empty-state__title">{loading ? "Loading sections..." : "No section selected"}</p>
            <p className="empty-state__description">Select a section from the top tabs to start editing.</p>
          </div>
        ) : (
          <div className="form-stack">
            <h3 className="section-title">{sectionMeta.title}</h3>
            <div className="cms-editor-note">
              <p className="info-text info-text--small">Website location: {sectionMeta.websiteLocation}</p>
              <p className="info-text info-text--small">Use "Media Library" for image fields, then save section.</p>
            </div>
            <label className="field"><span className="field__label">Title</span><input className="field__control" value={editor.title} onChange={(event) => setEditor((prev) => (prev ? { ...prev, title: event.target.value } : prev))} disabled={saving} /></label>
            <label className="field"><span className="field__label">Sort Order</span><input className="field__control" type="number" value={editor.sortOrder} onChange={(event) => setEditor((prev) => (prev ? { ...prev, sortOrder: Number(event.target.value || 0) } : prev))} disabled={saving} /></label>
            <label className="toggle-wrap"><input type="checkbox" checked={editor.isEnabled} onChange={(event) => setEditor((prev) => (prev ? { ...prev, isEnabled: event.target.checked } : prev))} disabled={saving} /><span>{editor.isEnabled ? "Enabled" : "Disabled"}</span></label>
            <div className="cms-home-editor__mode">
              <button type="button" className={`cms-home-editor__mode-btn ${!jsonMode ? "is-active" : ""}`} onClick={() => setJsonMode(false)}>Structured Fields</button>
              <button type="button" className={`cms-home-editor__mode-btn ${jsonMode ? "is-active" : ""}`} onClick={() => setJsonMode(true)}>Advanced JSON</button>
            </div>
            {!jsonMode ? (
              renderStructuredEditor()
            ) : (
              <>
                <label className="field"><span className="field__label">Content (JSON)</span><textarea className="textarea-control textarea-control--tall" value={editor.contentText} onChange={(event) => setEditor((prev) => (prev ? { ...prev, contentText: event.target.value } : prev))} disabled={saving} /></label>
                <p className="info-text info-text--small">Use valid JSON object shape for section-specific fields.</p>
              </>
            )}
            <button className="btn btn--primary" type="button" onClick={saveSection} disabled={saving || loading}>{saving ? "Saving..." : "Save Section"}</button>
          </div>
        )}
      </Card>
      <CmsMediaPickerModal
        isOpen={Boolean(mediaTargetPath)}
        selectedUrl={mediaTargetPath && parsedContent.value ? readString(parsedContent.value, mediaTargetPath) : undefined}
        onClose={() => setMediaTargetPath(null)}
        onSelect={handleMediaPick}
      />
    </PageShell>
  );
}

