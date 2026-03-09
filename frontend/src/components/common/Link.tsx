// File: frontend/src/components/common/Link.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
import React from "react";
import { Link as RouterLink } from "react-router-dom";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  to?: string;
  href?: string;
};

const isExternal = (value: string) =>
  value.startsWith("http://") ||
  value.startsWith("https://") ||
  value.startsWith("mailto:") ||
  value.startsWith("tel:") ||
  value.startsWith("#") ||
  value.includes("#");

const Link = ({ to, href, children, ...props }: Props) => {
  const target = to ?? href ?? "#";

  if (isExternal(target)) {
    return (
      <a href={target} {...props}>
        {children}
      </a>
    );
  }

  return (
    <RouterLink to={target} {...props}>
      {children}
    </RouterLink>
  );
};

export default Link;
