// File: frontend/src/lib/cmsImageResolver.ts
// Purpose: Provides frontend helper logic for CMS image resolver.
// It supports shared data, API, or formatting behavior used across the app.

import type { StaticImageData } from "@/components/common/Image";

type ImageRegistry = Record<string, StaticImageData>;

const isExternalOrAbsolute = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  if (trimmed.startsWith("./") || trimmed.startsWith("../")) return true;
  if (trimmed.startsWith("data:")) return true;
  return /^https?:\/\//i.test(trimmed);
};

const normalizeToken = (value: string) =>
  value
    .trim()
    .split(/[\\/]/)
    .pop()
    ?.toLowerCase()
    .replace(/\?.*$/, "")
    .replace(/#.*$/, "") || "";

export const resolveCmsImage = (
  value: string,
  registry: ImageRegistry,
  fallback: StaticImageData,
): string | StaticImageData => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (isExternalOrAbsolute(raw)) return raw;

  const key = normalizeToken(raw);
  if (key && registry[key]) return registry[key];
  return raw;
};

