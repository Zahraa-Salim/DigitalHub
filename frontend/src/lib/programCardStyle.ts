// File: frontend/src/lib/programCardStyle.ts
// What this code does:
// 1) Provides shared frontend helpers and API client utilities.
// 2) Centralizes fetch, parsing, and cross-page helper logic.
// 3) Reduces duplicated behavior across pages/components.
// 4) Exports reusable functions consumed by app modules.
import type { PublicSiteSettings } from "@/lib/publicApi";

export type ProgramCardStyle = "modern" | "classic";

export const DEFAULT_PROGRAM_CARD_STYLE: ProgramCardStyle = "modern";

function isProgramCardStyle(value: unknown): value is ProgramCardStyle {
  return value === "modern" || value === "classic";
}

export function resolveProgramCardStyle(siteSettings: PublicSiteSettings | null | undefined): ProgramCardStyle {
  const raw = siteSettings?.contact_info?.program_card_style;
  if (isProgramCardStyle(raw)) {
    return raw;
  }
  return DEFAULT_PROGRAM_CARD_STYLE;
}
