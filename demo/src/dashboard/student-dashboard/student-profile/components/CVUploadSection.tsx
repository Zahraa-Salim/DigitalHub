"use client";

import { useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

type CvAttachment = {
  id: number;
  profileId: number;
  fileName?: string | null;
  url?: string | null;
};

export default function CVUploadSection({
  cv,
  onReload,
  onMessage,
}: {
  cv: CvAttachment | null;
  onReload: () => Promise<void>;
  onMessage: (m: { error?: string | null; success?: string | null }) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);

  const pick = () => inputRef.current?.click();

  // ✅ Make download URL absolute (so it opens on backend, not Next.js website)
  const downloadHref = useMemo(() => {
    if (!cv?.url) return null;
    if (cv.url.startsWith("http://") || cv.url.startsWith("https://")) return cv.url;
    return `${API}${cv.url}`; // "/uploads/..." -> "http://localhost:3000/uploads/..."
  }, [cv?.url]);

  const validateFile = (file: File) => {
    const maxMB = 5;
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return "Please upload a PDF file.";
    if (file.size > maxMB * 1024 * 1024) return `Max file size is ${maxMB}MB.`;
    return null;
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      onMessage({ error: err, success: null });
      return;
    }
    onMessage({ error: null, success: null });
    setSelected(file);
  };

  const upload = async () => {
    if (!selected) return;

    onMessage({ error: null, success: null });

    try {
      setUploading(true);

      const fd = new FormData();
      fd.append("file", selected); // ✅ backend reads "file"

      const res = await fetch(`${API}/students/me/cv/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Upload failed");

      setSelected(null);
      await onReload();
      onMessage({ success: "CV uploaded ✅" });
    } catch (e: any) {
      onMessage({ error: e?.message || "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    onMessage({ error: null, success: null });

    try {
      const res = await fetch(`${API}/students/me/cv`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to delete CV");
      }

      await onReload();
      onMessage({ success: "CV deleted ✅" });
    } catch (e: any) {
      onMessage({ error: e?.message || "Failed to delete CV" });
    }
  };

  return (
    <div className="instructor__profile-form-wrap mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">CV Attachment</h5>

        {cv?.url ? (
          <div className="d-flex gap-2">
            <a
              className="btn btn-sm btn-border"
              href={downloadHref || "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={remove}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>

      {/* Current CV */}
      {cv?.url ? (
        <div className="border rounded p-3 mb-3">
          <div className="fw-semibold">{cv.fileName || "Your CV"}</div>
          <div className="small text-muted">Uploaded successfully.</div>
        </div>
      ) : (
        <div className="text-muted mb-3">No CV uploaded yet.</div>
      )}

      {/* Drop zone */}
      <div
        className="border rounded p-4 text-center"
        style={{
          borderStyle: "dashed",
          background: dragOver ? "rgba(0,0,0,0.03)" : "transparent",
          cursor: "pointer",
        }}
        onClick={pick}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          onFile(file || null);
        }}
      >
        <div className="fw-semibold mb-1">
          Drag & drop your PDF here, or click to browse
        </div>
        <div className="small text-muted">PDF only • max 5MB</div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="d-none"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </div>

      {/* Selected file */}
      {selected ? (
        <div className="border rounded p-3 mt-3 d-flex justify-content-between align-items-center">
          <div>
            <div className="fw-semibold">{selected.name}</div>
            <div className="small text-muted">
              {(selected.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-border"
              onClick={() => setSelected(null)}
              disabled={uploading}
            >
              Remove
            </button>
            <button
              type="button"
              className="btn btn-two"
              onClick={upload}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

