// File: src/components/common/Image.tsx
// Purpose: UI component responsible for rendering part of the interface (common/Image.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
import React from "react";

type StaticImageObject = {
  src: string;
  height?: number;
  width?: number;
  blurDataURL?: string;
};

export type StaticImageData = string | StaticImageObject;

type ImageSource = StaticImageData;

type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: ImageSource;
  fill?: boolean;
  priority?: boolean;
};

type VideoPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
};

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt = "", style, fill, priority: _priority, ...props }, ref) => {
    const resolvedSrc = typeof src === "string" ? src : src.src;

    return (
      <img
        ref={ref}
        src={resolvedSrc}
        alt={alt}
        style={fill ? { ...style, objectFit: "cover" } : style}
        {...props}
      />
    );
  }
);

Image.displayName = "Image";

export const VideoPopup = ({ isOpen, onClose, videoId }: VideoPopupProps) => {
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "960px",
          position: "relative",
          backgroundColor: "#000",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 16px 60px rgba(0, 0, 0, 0.35)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video popup"
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "36px",
            height: "36px",
            border: 0,
            borderRadius: "999px",
            cursor: "pointer",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            color: "#fff",
            fontSize: "24px",
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          x
        </button>
        <div style={{ width: "100%", aspectRatio: "16 / 9" }}>
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title="Video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ border: 0 }}
          />
        </div>
      </div>
    </div>
  );
};

export default Image;
