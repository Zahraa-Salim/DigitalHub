// File: frontend/src/dashboard/components/Card.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return <div className={cn("card", className)}>{children}</div>;
}
