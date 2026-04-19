import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiList } from "../utils/api";
import { buildQueryString } from "../utils/query";

type SearchResult = {
  id: string;
  entity: string;
  primary: string;
  secondary: string;
  badge?: string;
  badgeTone?: string;
  href: string;
};

type SearchGroup = {
  entity: string;
  results: SearchResult[];
};

function EntityIcon({ entity }: { entity: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (entity) {
    case "Applications":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      );
    case "Programs":
      return (
        <svg {...common}>
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
        </svg>
      );
    case "Cohorts":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "Events":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "Announcements":
      return (
        <svg {...common}>
          <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6l-5 4H4a1 1 0 0 0-1 1Z" />
          <path d="M18 8a5 5 0 0 1 0 8" />
        </svg>
      );
    case "Admins":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
      );
    case "Students":
      return (
        <svg {...common}>
          <path d="M22 10v6" />
          <path d="M2 10 12 5l10 5-10 5Z" />
          <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
        </svg>
      );
    case "Templates":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
          <polyline points="3 7 12 13 21 7" />
        </svg>
      );
    case "Contact":
      return (
        <svg {...common}>
          <path d="M4 4h16v12H5.17L4 17.17Z" />
        </svg>
      );
    default:
      return null;
  }
}

const SEARCH_SOURCES = [
  {
    entity: "Applications",
    endpoint: (q: string) =>
      `/applications${buildQueryString({ search: q, limit: 5, sortBy: "submitted_at", order: "desc" })}`,
    map: (row: any): SearchResult => ({
      id: `app-${row.id}`,
      entity: "Applications",
      primary: row.full_name || row.email || `Application #${row.id}`,
      secondary: row.email || row.phone || "",
      badge: row.status || row.stage,
      badgeTone: row.status || row.stage,
      href: `/admin/admissions${buildQueryString({
        search: row.full_name || row.email || "",
        cohort_id: row.cohort_id,
      })}`,
    }),
  },
  {
    entity: "Programs",
    endpoint: (q: string) => `/programs${buildQueryString({ search: q, limit: 5 })}`,
    map: (row: any): SearchResult => ({
      id: `prog-${row.id}`,
      entity: "Programs",
      primary: row.title || `Program #${row.id}`,
      secondary: row.summary ? String(row.summary).slice(0, 80) : row.slug || "",
      badge: row.is_published ? "Published" : "Draft",
      badgeTone: row.is_published ? "published" : "draft",
      href: "/admin/programs",
    }),
  },
  {
    entity: "Cohorts",
    endpoint: (q: string) => `/cohorts${buildQueryString({ search: q, limit: 5 })}`,
    map: (row: any): SearchResult => ({
      id: `cohort-${row.id}`,
      entity: "Cohorts",
      primary: row.name || `Cohort #${row.id}`,
      secondary: row.program_title || "",
      badge: row.status || "",
      badgeTone: row.status || "default",
      href: "/admin/programs",
    }),
  },
  {
    entity: "Events",
    endpoint: (q: string) => `/events${buildQueryString({ search: q, limit: 5 })}`,
    map: (row: any): SearchResult => ({
      id: `event-${row.id}`,
      entity: "Events",
      primary: row.title || `Event #${row.id}`,
      secondary: row.location
        ? `${row.location} · ${row.starts_at ? new Date(row.starts_at).toLocaleDateString() : ""}`
        : row.starts_at
          ? new Date(row.starts_at).toLocaleDateString()
          : "",
      badge: row.is_done ? "Completed" : "Upcoming",
      badgeTone: row.is_done ? "completed" : "open",
      href: "/admin/events",
    }),
  },
  {
    entity: "Announcements",
    endpoint: (q: string) => `/announcements${buildQueryString({ search: q, limit: 5 })}`,
    map: (row: any): SearchResult => ({
      id: `ann-${row.id}`,
      entity: "Announcements",
      primary: row.title || `Announcement #${row.id}`,
      secondary: row.body ? String(row.body).slice(0, 80) : "",
      badge: row.is_published ? "Published" : "Draft",
      badgeTone: row.is_published ? "published" : "draft",
      href: "/admin/announcements",
    }),
  },
  {
    entity: "Admins",
    endpoint: (q: string) => `/admins${buildQueryString({ search: q, limit: 5 })}`,
    map: (row: any): SearchResult => ({
      id: `admin-${row.id || row.user_id}`,
      entity: "Admins",
      primary: row.full_name || row.email || `Admin #${row.id || row.user_id}`,
      secondary: row.email || "",
      badge: row.role || row.admin_role,
      badgeTone: "default",
      href: "/admin/admins",
    }),
  },
  {
    entity: "Students",
    endpoint: (q: string) => `/profiles/students${buildQueryString({ search: q, limit: 5 })}`,
    map: (row: any): SearchResult => ({
      id: `student-${row.user_id || row.id}`,
      entity: "Students",
      primary: row.full_name || row.email || `Student #${row.user_id || row.id}`,
      secondary: row.email || "",
      href: "/admin/profiles/students",
    }),
  },
  {
    entity: "Templates",
    endpoint: (q: string) => `/message-templates${buildQueryString({ search: q, limit: 5 })}`,
    map: (row: any): SearchResult => ({
      id: `tmpl-${row.id}`,
      entity: "Templates",
      primary: row.label || row.name || row.key || `Template #${row.id}`,
      secondary: row.key || "",
      href: "/admin/message-templates",
    }),
  },
  {
    entity: "Contact",
    endpoint: (q: string) => `/contact${buildQueryString({ search: q, limit: 5 })}`,
    map: (row: any): SearchResult => ({
      id: `contact-${row.id}`,
      entity: "Contact",
      primary: row.full_name || row.name || row.email || `Contact #${row.id}`,
      secondary: row.subject ? String(row.subject).slice(0, 60) : row.email || "",
      href: "/admin/contact",
    }),
  },
] as const;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const handleIconClick = () => {
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 50);
      }
    };

    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, []);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      navigate(result.href);
      setOpen(false);
      setQuery("");
      setGroups([]);
      setActiveIndex(-1);
    },
    [navigate],
  );

  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
        setGroups([]);
        setActiveIndex(-1);
        return;
      }

      const allResults = groups.flatMap((group) => group.results);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, allResults.length - 1));
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, -1));
      }

      if (event.key === "Enter" && activeIndex >= 0) {
        const result = allResults[activeIndex];
        if (result) {
          handleResultClick(result);
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
        setGroups([]);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeIndex, groups, handleResultClick, open]);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setActiveIndex(-1);

    const results = await Promise.allSettled(
      SEARCH_SOURCES.map(async (source) => {
        const data = await apiList<any>(source.endpoint(trimmed));
        return {
          entity: source.entity,
          results: (data.data || []).map((row: any) => source.map(row)),
        };
      }),
    );

    const filled: SearchGroup[] = [];
    results.forEach((result) => {
      if (result.status !== "fulfilled" || result.value.results.length === 0) {
        return;
      }
      filled.push({
        entity: result.value.entity,
        results: result.value.results,
      });
    });

    setGroups(filled);
    setLoading(false);
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(value);
    }, 280);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const totalResults = groups.reduce((sum, group) => sum + group.results.length, 0);
  let resultIndex = 0;

  return (
    <div className="gsearch" ref={containerRef}>
      <button
        type="button"
        className={`gsearch__icon-btn${open ? " gsearch__icon-btn--active" : ""}`}
        onClick={handleIconClick}
        aria-label="Open global search"
        title="Search dashboard (Ctrl+K)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {open ? (
        <div className="gsearch__panel" role="combobox" aria-expanded={open}>
          <div className="gsearch__input-row">
            <svg
              className="gsearch__input-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              className="gsearch__input"
              type="search"
              placeholder="Search applications, programs, events, students..."
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              autoComplete="off"
              aria-label="Global search"
            />
            {loading ? <div className="gsearch__spinner" aria-label="Searching..." /> : null}
            {!loading && query ? (
              <button
                type="button"
                className="gsearch__clear"
                onClick={() => {
                  setQuery("");
                  setGroups([]);
                  setActiveIndex(-1);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
            <kbd className="gsearch__esc-hint">ESC</kbd>
          </div>

          {query.trim().length >= 2 && !loading && groups.length === 0 ? (
            <div className="gsearch__empty">
              <span>
                No results for <strong>"{query}"</strong>
              </span>
            </div>
          ) : null}

          {query.trim().length < 2 && query.trim().length > 0 ? (
            <div className="gsearch__hint">Type at least 2 characters to search...</div>
          ) : null}

          {query.trim().length === 0 ? (
            <div className="gsearch__hint">
              Search across applications, programs, cohorts, events, students, and more.
            </div>
          ) : null}

          {groups.length > 0 ? (
            <div className="gsearch__results" role="listbox">
              {groups.map((group) => (
                <div key={group.entity} className="gsearch__group">
                  <div className="gsearch__group-label">
                    <span className="gsearch__group-icon" aria-hidden="true">
                      <EntityIcon entity={group.entity} />
                    </span>
                    {group.entity}
                    <span className="gsearch__group-count">{group.results.length}</span>
                  </div>
                  {group.results.map((result) => {
                    const thisIndex = resultIndex++;
                    const isActive = thisIndex === activeIndex;
                    return (
                      <button
                        key={result.id}
                        type="button"
                        className={`gsearch__result${isActive ? " gsearch__result--active" : ""}`}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setActiveIndex(thisIndex)}
                        role="option"
                        aria-selected={isActive}
                      >
                        <span className="gsearch__result-text">
                          <span className="gsearch__result-primary">{result.primary}</span>
                          {result.secondary ? (
                            <span className="gsearch__result-secondary">{result.secondary}</span>
                          ) : null}
                        </span>
                        {result.badge ? (
                          <span className={`gsearch__badge gsearch__badge--${result.badgeTone || "default"}`}>
                            {result.badge}
                          </span>
                        ) : null}
                        <span className="gsearch__result-arrow">→</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="gsearch__footer">
                {totalResults} result{totalResults !== 1 ? "s" : ""} ·
                <span className="gsearch__footer-hint"> ↑↓ navigate · Enter to open · ESC to close</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
