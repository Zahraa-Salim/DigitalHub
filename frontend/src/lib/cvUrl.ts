import { resolveFallbackApiUrl } from "./resolveApiUrl";

const API_BASE_URL = (import.meta.env.VITE_API_URL || resolveFallbackApiUrl()).replace(/\/$/, "");

const ABSOLUTE_URL_RE = /^https?:\/\//i;
const OFFICE_DOCUMENT_RE = /\.(docx?|pptx?|xlsx?)($|[?#])/i;

export function resolveCvUrl(url: string | null | undefined): string {
  const value = String(url || "").trim();
  if (!value) return "";
  if (ABSOLUTE_URL_RE.test(value)) return value;
  if (value.startsWith("/uploads/")) return `${API_BASE_URL}${value}`;
  if (value.startsWith("/")) return value;
  return `${API_BASE_URL}/${value}`;
}

export function getGoogleDriveFileId(url: string | null | undefined): string {
  const value = String(url || "").trim();
  if (!value) return "";

  const filePathMatch = value.match(/drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([^/?#]+)/i);
  if (filePathMatch?.[1]) return filePathMatch[1];

  try {
    const parsed = new URL(value);
    if (!/drive\.google\.com$/i.test(parsed.hostname)) return "";
    return parsed.searchParams.get("id") || "";
  } catch {
    return "";
  }
}

export function isLocalCvUrl(url: string | null | undefined): boolean {
  try {
    const parsed = new URL(resolveCvUrl(url));
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function isOfficeDocumentUrl(url: string | null | undefined): boolean {
  return OFFICE_DOCUMENT_RE.test(String(url || "").trim());
}

export function getCvPreviewUrl(url: string | null | undefined): string {
  const resolvedUrl = resolveCvUrl(url);
  if (!resolvedUrl) return "";

  const driveFileId = getGoogleDriveFileId(resolvedUrl);
  if (driveFileId) {
    return `https://drive.google.com/file/d/${driveFileId}/preview`;
  }

  if (isOfficeDocumentUrl(resolvedUrl)) {
    if (!ABSOLUTE_URL_RE.test(resolvedUrl)) return "";
    if (isLocalCvUrl(resolvedUrl)) return "";
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resolvedUrl)}`;
  }

  return resolvedUrl;
}
