type CmsContent = Record<string, unknown> | null | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeKeys = (keys: string | string[]) => (Array.isArray(keys) ? keys : [keys]);

const pickRawValue = (content: CmsContent, keys: string | string[]) => {
  if (!isRecord(content)) return undefined;
  for (const key of normalizeKeys(keys)) {
    if (!Object.prototype.hasOwnProperty.call(content, key)) continue;
    const value = content[key];
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
};

export const getCmsString = (
  content: CmsContent,
  keys: string | string[],
  fallback = "",
) => {
  const value = pickRawValue(content, keys);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
};

export const getCmsNumber = (
  content: CmsContent,
  keys: string | string[],
  fallback: number,
  min?: number,
  max?: number,
) => {
  const value = pickRawValue(content, keys);
  let parsed: number | null = null;
  if (typeof value === "number" && Number.isFinite(value)) {
    parsed = value;
  } else if (typeof value === "string") {
    const fromString = Number(value.trim());
    if (Number.isFinite(fromString)) {
      parsed = fromString;
    }
  }
  if (parsed === null) return fallback;
  if (typeof min === "number" && parsed < min) return fallback;
  if (typeof max === "number" && parsed > max) return fallback;
  return parsed;
};

export const getCmsBoolean = (
  content: CmsContent,
  keys: string | string[],
  fallback = false,
) => {
  const value = pickRawValue(content, keys);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return fallback;
};

export const getCmsRecord = (
  content: CmsContent,
  keys: string | string[],
): Record<string, unknown> | null => {
  const value = pickRawValue(content, keys);
  return isRecord(value) ? value : null;
};

export const getCmsStringArray = (
  content: CmsContent,
  keys: string | string[],
  fallback: string[] = [],
) => {
  const value = pickRawValue(content, keys);
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (typeof entry === "number" || typeof entry === "boolean") return String(entry);
      return "";
    })
    .filter(Boolean);
  return normalized.length ? normalized : fallback;
};

export const getCmsRecordArray = (
  content: CmsContent,
  keys: string | string[],
) => {
  const value = pickRawValue(content, keys);
  if (!Array.isArray(value)) return [] as Record<string, unknown>[];
  return value.filter((entry): entry is Record<string, unknown> => isRecord(entry));
};

