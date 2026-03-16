// File: frontend/src/hooks/useCmsPage.ts
// Purpose: Provides the useCmsPage hook and useCmsBreadcrumb helper.
// Uses TanStack Query for caching - replaces the manual useEffect + useState pattern.

import { useQuery } from "@tanstack/react-query";
import { getPublicPageByKey, type PublicPage } from "@/lib/publicApi";
import { getCmsString } from "@/lib/cmsContent";

type BreadcrumbConfig = {
  title: string;
  subTitle: string;
};

type UseCmsBreadcrumbOptions = {
  defaultsTitle: string;
  defaultsSubTitle: string;
};

export const useCmsPage = (pageKey: string): PublicPage | null => {
  const normalizedKey = String(pageKey || "").trim();

  const { data } = useQuery({
    queryKey: ["public", "page", normalizedKey],
    queryFn: () => getPublicPageByKey(normalizedKey),
    staleTime: 60_000,
    enabled: Boolean(normalizedKey),
  });

  return data ?? null;
};

export const useCmsBreadcrumb = (
  pageKey: string,
  options: UseCmsBreadcrumbOptions,
): BreadcrumbConfig => {
  const page = useCmsPage(pageKey);
  const content = page?.content ?? null;

  const title = getCmsString(
    content,
    ["hero_title", "heroTitle", "title", "heading"],
    options.defaultsTitle,
  );
  const subTitle = getCmsString(
    content,
    ["hero_subtitle", "heroSubtitle", "subtitle", "sub_title", "label"],
    options.defaultsSubTitle,
  );

  return { title, subTitle };
};
