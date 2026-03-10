// File: frontend/src/dashboard/utils/cn.ts
// Purpose: Provides dashboard utility functions for cn.
// It supports repeated admin-side formatting, query, or state logic.

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

