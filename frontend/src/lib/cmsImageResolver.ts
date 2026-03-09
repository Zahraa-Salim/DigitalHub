// File: frontend/src/lib/cmsImageResolver.ts
// What this code does:
// 1) Provides shared frontend helpers and API client utilities.
// 2) Centralizes fetch, parsing, and cross-page helper logic.
// 3) Reduces duplicated behavior across pages/components.
// 4) Exports reusable functions consumed by app modules.
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

