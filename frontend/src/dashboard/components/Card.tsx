// File: frontend/src/dashboard/components/Card.tsx
// Purpose: Renders the dashboard card component.
// It packages reusable admin UI and behavior for dashboard pages.

import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return <div className={cn("card", className)}>{children}</div>;
}

