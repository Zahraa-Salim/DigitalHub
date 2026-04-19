export const PROGRAM_CARD_COLORS = [
  { bg: "#1a6bcc", accent: "#4d9fff" },
  { bg: "#0d7d5f", accent: "#2bbf91" },
  { bg: "#7c3aed", accent: "#a78bfa" },
  { bg: "#b45309", accent: "#fbbf24" },
  { bg: "#be123c", accent: "#fb7185" },
  { bg: "#0369a1", accent: "#38bdf8" },
  { bg: "#166534", accent: "#4ade80" },
  { bg: "#9d174d", accent: "#f472b6" },
] as const;

export function getProgramCardColor(programTitle: string): { bg: string; accent: string } {
  const safeTitle = String(programTitle || "");
  const hash = safeTitle.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PROGRAM_CARD_COLORS[hash % PROGRAM_CARD_COLORS.length];
}
