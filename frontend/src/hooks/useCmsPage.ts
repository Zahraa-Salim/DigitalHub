// File: frontend/src/hooks/useCmsPage.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
"use client";

import { useEffect, useState } from "react";
import { getPublicPageByKey, type PublicPage } from "@/lib/publicApi";
import { getCmsString } from "@/lib/cmsContent";

type BreadcrumbConfig = {
  title: string;
  subTitle: string;
};

type UseCmsBreadcrumbOptions = {
  /**
   * Fallback values used when the CMS page is missing or incomplete.
   */
  defaultsTitle: string;
  defaultsSubTitle: string;
};

export const useCmsPage = (pageKey: string) => {
  const [page, setPage] = useState<PublicPage | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const normalizedKey = String(pageKey || "").trim();
      if (!normalizedKey) return;

      try {
        const data = await getPublicPageByKey(normalizedKey);
        if (!active) return;
        setPage(data);
      } catch {
        // Keep null page on error to preserve hardcoded fallbacks.
        if (!active) return;
        setPage(null);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [pageKey]);

  return page;
};

export const useCmsBreadcrumb = (pageKey: string, options: UseCmsBreadcrumbOptions): BreadcrumbConfig => {
  const page = useCmsPage(pageKey);
  const content = page?.content ?? null;

  const title = getCmsString(content, ["hero_title", "heroTitle", "title", "heading"], options.defaultsTitle);
  const subTitle = getCmsString(
    content,
    ["hero_subtitle", "heroSubtitle", "subtitle", "sub_title", "label"],
    options.defaultsSubTitle,
  );

  return { title, subTitle };
};

