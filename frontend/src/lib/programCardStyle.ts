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
