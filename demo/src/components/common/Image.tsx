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

export default Image;
