import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, apiList } from "../../utils/api";

export type HomeSectionRow = {
  id: number;
  key: string;
  title: string | null;
  is_enabled: boolean;
  sort_order: number;
  content: Record<string, unknown> | null;
  updated_at: string;
};

export type EditorSection = HomeSectionRow & {
  isDirty: boolean;
  local: Record<string, unknown>;
  localContent: Record<string, unknown>;
};

export type EditTarget = {
  sectionId: number;
  field: string;
  label: string;
  type: ActiveField["type"] | "richtext";
  currentValue: string;
};

export type ActiveField = {
  sectionId: number;
  field: string;
  type: "text" | "textarea" | "image";
  anchorEl: HTMLElement;
};

type EditorCtx = {
  sections: EditorSection[];
  activeField: ActiveField | null;
  saving: boolean;
  hasDirty: boolean;
  error: string | null;
  successMsg: string | null;
  openField: (sectionId: number, field: string, type: ActiveField["type"], anchor: HTMLElement) => void;
  closeField: () => void;
  setValue: (sectionId: number, field: string, value: string) => void;
  getValue: (sectionId: number, field: string) => string;
  saveAll: () => Promise<void>;
  toggleSection: (sectionId: number) => void;
  moveSection: (sectionId: number, dir: "up" | "down") => void;
};

const Ctx = createContext<EditorCtx | null>(null);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toRecord = (value: unknown) => (isRecord(value) ? { ...value } : {});

const getAtPath = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = String(path || "").split(".").filter(Boolean);
  let current: unknown = obj;
  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
};

const setAtPath = (obj: Record<string, unknown>, path: string, value: string) => {
  const parts = String(path || "").split(".").filter(Boolean);
  if (parts.length === 0) return obj;

  const root = { ...obj };
  let current: Record<string, unknown> = root;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const isLast = index === parts.length - 1;

    if (isLast) {
      current[part] = value;
      return root;
    }

    const next = isRecord(current[part]) ? { ...current[part] } : {};
    current[part] = next;
    current = next;
  }

  return root;
};

const sortSections = (items: EditorSection[]) =>
  [...items].sort((a, b) => {
    const sortDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    if (sortDiff !== 0) return sortDiff;
    return Number(a.id ?? 0) - Number(b.id ?? 0);
  });

export function useEditor() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useEditor must be used inside EditorProvider");
  }
  return ctx;
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const result = await apiList<HomeSectionRow>("/cms/home-sections?page=1&limit=200&sortBy=sort_order&order=asc");
        if (!active) return;
        setSections(sortSections(result.data.map((section) => ({
          ...section,
          isDirty: false,
          local: toRecord(section.content),
          localContent: toRecord(section.content),
        }))));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load CMS sections.");
      }
    };

    void load();

    return () => {
      active = false;
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const getValue = useCallback((sectionId: number, field: string) => {
    const section = sections.find((entry) => entry.id === sectionId);
    if (!section) return "";
    const value = getAtPath(section.local, field);
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";
  }, [sections]);

  const setValue = useCallback((sectionId: number, field: string, value: string) => {
    setSections((prev) =>
      prev.map((section) => (
        section.id === sectionId
          ? (() => {
              const nextLocal = setAtPath(section.local, field, value);
              return { ...section, isDirty: true, local: nextLocal, localContent: nextLocal };
            })()
          : section
      )),
    );
  }, []);

  const openField = useCallback((sectionId: number, field: string, type: ActiveField["type"], anchorEl: HTMLElement) => {
    setActiveField({ sectionId, field, type, anchorEl });
  }, []);

  const closeField = useCallback(() => setActiveField(null), []);

  const toggleSection = useCallback((sectionId: number) => {
    setSections((prev) =>
      prev.map((section) => (
        section.id === sectionId
          ? { ...section, isDirty: true, is_enabled: !section.is_enabled }
          : section
      )),
    );
  }, []);

  const moveSection = useCallback((sectionId: number, dir: "up" | "down") => {
    setSections((prev) => {
      const sorted = sortSections(prev);
      const idx = sorted.findIndex((section) => section.id === sectionId);
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;

      if (idx < 0 || targetIdx < 0 || targetIdx >= sorted.length) {
        return prev;
      }

      const next = [...sorted];
      const tmp = next[idx].sort_order;
      next[idx] = { ...next[idx], sort_order: next[targetIdx].sort_order, isDirty: true };
      next[targetIdx] = { ...next[targetIdx], sort_order: tmp, isDirty: true };
      return sortSections(next);
    });
  }, []);

  const saveAll = useCallback(async () => {
    const dirty = sections.filter((section) => section.isDirty);
    if (dirty.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      await Promise.all(
        dirty.map((section) =>
          api<HomeSectionRow>(`/cms/home-sections/${section.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              title: section.title,
              is_enabled: section.is_enabled,
              sort_order: section.sort_order,
              content: section.local,
            }),
          }),
        ),
      );

      setSections((prev) => prev.map((section) => ({ ...section, isDirty: false })));
      setSuccessMsg("Saved!");

      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = window.setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [sections]);

  const hasDirty = useMemo(() => sections.some((section) => section.isDirty), [sections]);

  return (
    <Ctx.Provider
      value={{
        sections,
        activeField,
        saving,
        hasDirty,
        error,
        successMsg,
        openField,
        closeField,
        setValue,
        getValue,
        saveAll,
        toggleSection,
        moveSection,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
