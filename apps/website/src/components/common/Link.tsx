// File: src/components/common/Link.tsx
// Purpose: UI component responsible for rendering part of the interface (common/Link.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
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
