// File: frontend/src/components/common/Link.tsx
// Purpose: Renders the shared link UI element used across the site.
// It keeps common presentation behavior reusable between pages and sections.

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

