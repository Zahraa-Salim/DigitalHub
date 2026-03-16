import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

export type CmsPageRow = {
  id: number;
  key: string;
  title: string | null;
  content: Record<string, unknown> | null;
  is_published: boolean;
  updated_at: string;
};

export type EditorSection = HomeSectionRow & {
  isDirty: boolean;
  local: Record<string, unknown>;
};

export type EditorPage = CmsPageRow & {
  isDirty: boolean;
  local: Record<string, unknown>;
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
  pages: Record<string, EditorPage>;
  toggleSection: (sectionId: number) => void;
  moveSection: (sectionId: number, dir: "up" | "down") => void;
  getPageValue: (pageKey: string, field: string) => string;
  setPageValue: (pageKey: string, field: string, value: string) => void;
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
};

const Ctx = createContext<EditorCtx | null>(null);

const REQUIRED_PAGE_KEYS = ["navbar", "footer", "about"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toRecord = (value: unknown) => (isRecord(value) ? { ...value } : {});

const getAtPath = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split(".").filter(Boolean);
  let current: unknown = obj;
  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
};

const setAtPath = (obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return obj;
  const root = { ...obj };
  let current: Record<string, unknown> = root;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (index === parts.length - 1) {
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
    const diff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    return diff !== 0 ? diff : Number(a.id) - Number(b.id);
  });

const createPlaceholderPage = (pageKey: string): EditorPage => ({
  id: 0,
  key: pageKey,
  title: null,
  content: {},
  is_published: false,
  updated_at: "",
  isDirty: false,
  local: {},
});

export function useEditor() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [pages, setPages] = useState<Record<string, EditorPage>>({});
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    setError(null);
    setSuccessMsg(null);
    setSections([]);
    setPages({});
    setActiveField(null);

    const load = async () => {
      try {
        const [sectionsResult, pagesResult] = await Promise.all([
          apiList<HomeSectionRow>("/cms/home-sections?page=1&limit=200&sortBy=sort_order&order=asc"),
          apiList<CmsPageRow>("/cms/pages?page=1&limit=200"),
        ]);

        if (!active) return;

        setSections(sortSections(sectionsResult.data.map((section) => ({
          ...section,
          isDirty: false,
          local: toRecord(section.content),
        }))));

        const pagesMap: Record<string, EditorPage> = {};
        for (const page of pagesResult.data) {
          pagesMap[page.key] = {
            ...page,
            isDirty: false,
            local: toRecord(page.content),
          };
        }
        for (const key of REQUIRED_PAGE_KEYS) {
          if (!pagesMap[key]) {
            pagesMap[key] = createPlaceholderPage(key);
          }
        }
        setPages(pagesMap);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load editor data.");
      }
    };

    void load();

    return () => {
      active = false;
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
      prev.map((section) =>
        section.id === sectionId
          ? (() => {
              const nextLocal = setAtPath(section.local, field, value);
              return {
                ...section,
                isDirty: true,
                local: nextLocal,
              };
            })()
          : section,
      ),
    );
  }, []);

  const getPageValue = useCallback((pageKey: string, field: string) => {
    const page = pages[pageKey];
    if (!page) return "";
    const value = getAtPath(page.local, field);
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";
  }, [pages]);

  const setPageValue = useCallback((pageKey: string, field: string, value: string) => {
    setPages((prev) => {
      const page = prev[pageKey];
      if (!page) return prev;
      return {
        ...prev,
        [pageKey]: {
          ...page,
          isDirty: true,
          local: setAtPath(page.local, field, value),
        },
      };
    });
  }, []);

  const toggleSection = useCallback((sectionId: number) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, isDirty: true, is_enabled: !section.is_enabled }
          : section,
      ),
    );
  }, []);

  const moveSection = useCallback((sectionId: number, dir: "up" | "down") => {
    setSections((prev) => {
      const sorted = sortSections(prev);
      const index = sorted.findIndex((section) => section.id === sectionId);
      const targetIndex = dir === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return prev;
      const next = [...sorted];
      const temp = next[index].sort_order;
      next[index] = { ...next[index], sort_order: next[targetIndex].sort_order, isDirty: true };
      next[targetIndex] = { ...next[targetIndex], sort_order: temp, isDirty: true };
      return sortSections(next);
    });
  }, []);

  const openField = useCallback((sectionId: number, field: string, type: ActiveField["type"], anchorEl: HTMLElement) => {
    setActiveField({ sectionId, field, type, anchorEl });
  }, []);

  const closeField = useCallback(() => setActiveField(null), []);

  const saveAll = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const dirtySections = sections.filter((section) => section.isDirty);
      const dirtyPages = Object.values(pages).filter((page) => page.isDirty && page.id !== 0);

      if (!dirtySections.length && !dirtyPages.length) {
        return;
      }

      await Promise.all([
        ...dirtySections.map((section) =>
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
        ...dirtyPages.map((page) =>
          api<CmsPageRow>(`/cms/pages/${page.id}`, {
            method: "PATCH",
            body: JSON.stringify({ content: page.local }),
          }),
        ),
      ]);

      if (dirtySections.length) {
        setSections((prev) => prev.map((section) => ({ ...section, isDirty: false })));
      }
      if (dirtyPages.length) {
        setPages((prev) => {
          const next = { ...prev };
          for (const page of dirtyPages) {
            next[page.key] = {
              ...next[page.key],
              isDirty: false,
            };
          }
          return next;
        });
      }

      setSuccessMsg("Saved!");
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [pages, sections]);

  const hasDirty = useMemo(
    () => sections.some((section) => section.isDirty) || Object.values(pages).some((page) => page.isDirty),
    [pages, sections],
  );

  return (
    <Ctx.Provider
      value={{
        sections,
        pages,
        toggleSection,
        moveSection,
        getPageValue,
        setPageValue,
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
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
