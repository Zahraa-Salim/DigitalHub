// File: frontend/src/dashboard/components/CmsMediaPickerModal.tsx
// Purpose: Renders the dashboard CMS media picker modal component.
// It packages reusable admin UI and behavior for dashboard pages.

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { API_URL, ApiError, api, apiList } from "../utils/api";
import { useDashboardToasts } from "../hooks/useDashboardToasts";
import { PulseDots } from "./PulseDots";
import { ToastStack } from "./ToastStack";

export type CmsMediaAsset = {
  id: number;
  file_name: string;
  original_name: string | null;
  mime_type: string;
  size_bytes: number;
  public_url: string;
  alt_text?: string | null;
  created_at: string;
};

type CmsMediaPickerModalProps = {
  isOpen: boolean;
  selectedUrl?: string;
  onClose: () => void;
  onSelect: (asset: CmsMediaAsset) => void;
};

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

function resolveAssetUrl(publicUrl: string): string {
  const raw = String(publicUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }
  const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  try {
    const api = new URL(API_URL);
    return `${api.origin}${normalizedPath}`;
  } catch {
    return `${API_URL.replace(/\/$/, "")}${normalizedPath}`;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function parseImageDataUrl(value: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp|gif|svg\+xml));base64,(.+)$/i.exec(value);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), base64: match[2] };
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function CmsMediaPickerModal({ isOpen, selectedUrl, onClose, onSelect }: CmsMediaPickerModalProps) {
  const [rows, setRows] = useState<CmsMediaAsset[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();

  const selectedNormalized = useMemo(() => String(selectedUrl || "").trim(), [selectedUrl]);

  const loadAssets = async (nextSearch = search) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: "1",
        limit: "200",
        sortBy: "created_at",
        order: "desc",
      });
      if (nextSearch.trim()) query.set("search", nextSearch.trim());
      const result = await apiList<CmsMediaAsset>(`/cms/media?${query.toString()}`);
      setRows(result.data);
    } catch (err) {
      setRows([]);
      pushToast("error", err instanceof ApiError ? err.message || "Failed to load media library." : "Failed to load media library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 220);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, searchInput]);

  useEffect(() => {
    if (!isOpen) return;
    void loadAssets(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, search]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type.toLowerCase())) {
      pushToast("error", "Unsupported file type. Upload JPG, PNG, WEBP, GIF, or SVG.");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const parsed = parseImageDataUrl(dataUrl);
      if (!parsed) {
        throw new Error("Unable to parse image file.");
      }
      const uploaded = await api<CmsMediaAsset>("/cms/media", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          mime_type: parsed.mimeType,
          data_base64: parsed.base64,
        }),
      });
      onSelect(uploaded);
      onClose();
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message || "Upload failed." : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cms-media-modal" role="dialog" aria-modal="true" aria-label="Media library">
      <button type="button" className="cms-media-modal__backdrop" onClick={onClose} aria-label="Close media library" />
      <div className="cms-media-modal__card">
        <div className="cms-media-modal__header">
          <div>
            <h3>Media Library</h3>
            <p>Upload and select images for CMS fields.</p>
          </div>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>Close</button>
        </div>
        <div className="cms-media-modal__controls">
          <input
            className="field__control"
            placeholder="Search by file name..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <label className="btn btn--primary btn--sm cms-media-modal__upload-btn">
            {uploading ? "Uploading..." : "Upload Image"}
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        <div className="cms-media-modal__list">
          {loading ? <PulseDots padding={20} label="Loading media files" /> : null}
          {!loading && rows.length === 0 ? <p className="info-text">No files found.</p> : null}
          {!loading ? (
            <div className="cms-media-grid">
              {rows.map((asset) => {
                const resolvedUrl = resolveAssetUrl(asset.public_url);
                const isSelected = selectedNormalized === asset.public_url;
                return (
                  <button
                    type="button"
                    key={asset.id}
                    className={`cms-media-grid__item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => onSelect(asset)}
                  >
                    <div className="cms-media-grid__thumb">
                      <img src={resolvedUrl} alt={asset.alt_text || asset.original_name || asset.file_name} loading="lazy" />
                    </div>
                    <p className="cms-media-grid__name" title={asset.file_name}>{asset.file_name}</p>
                    <p className="cms-media-grid__meta">{formatBytes(asset.size_bytes)}</p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      </div>
    </div>
  );
}

