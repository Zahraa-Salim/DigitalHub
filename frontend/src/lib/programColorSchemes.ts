// File: frontend/src/lib/programColorSchemes.ts
// Purpose: Defines color schemes and icons for program cohort cards.

export interface ColorScheme {
  id: number;
  name: string;
  gradientStart: string;
  gradientEnd: string;
  glowColor: string;
  defaultIcon: string;
  category: string;
}

export const COLOR_SCHEMES: Record<number, ColorScheme> = {
  1: {
    id: 1,
    name: "Blue Tech",
    gradientStart: "#6CB3D4",
    gradientEnd: "#F0F8FF",
    glowColor: "rgba(108, 179, 212, 0.45)",
    defaultIcon: "fa-code",
    category: "Software/Web Dev",
  },
  2: {
    id: 2,
    name: "Purple AI",
    gradientStart: "#D166D9",
    gradientEnd: "#F5F0FF",
    glowColor: "rgba(209, 102, 217, 0.45)",
    defaultIcon: "fa-brain",
    category: "AI/ML/Data",
  },
  3: {
    id: 3,
    name: "Green Dev",
    gradientStart: "#4FD9A0",
    gradientEnd: "#E8FFF5",
    glowColor: "rgba(79, 217, 160, 0.45)",
    defaultIcon: "fa-server",
    category: "DevOps/Backend",
  },
  4: {
    id: 4,
    name: "Orange Creator",
    gradientStart: "#FFD170",
    gradientEnd: "#FFF8F0",
    glowColor: "rgba(255, 209, 112, 0.45)",
    defaultIcon: "fa-palette",
    category: "Design/Creative",
  },
  5: {
    id: 5,
    name: "Red Innovation",
    gradientStart: "#FF7A8A",
    gradientEnd: "#FFF0F2",
    glowColor: "rgba(255, 122, 138, 0.45)",
    defaultIcon: "fa-rocket",
    category: "Startup/Innovation",
  },
  6: {
    id: 6,
    name: "Teal Future",
    gradientStart: "#8FE0E0",
    gradientEnd: "#F0FFFF",
    glowColor: "rgba(143, 224, 224, 0.45)",
    defaultIcon: "fa-cloud",
    category: "Cloud/Modern",
  },
};

export function getColorScheme(id: number | null | undefined): ColorScheme {
  const schemeId = Number(id) || 1;
  return COLOR_SCHEMES[schemeId] || COLOR_SCHEMES[1];
}

export function getNextColorSchemeId(currentId: number | null | undefined): number {
  const current = Number(currentId) || 0;
  const next = (current % 6) + 1;
  return next;
}
