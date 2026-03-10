// File: frontend/src/dashboard/utils/query.ts
// Purpose: Provides dashboard utility functions for query.
// It supports repeated admin-side formatting, query, or state logic.

export type QueryValue = string | number | boolean | Array<string | number | boolean> | null | undefined;

export function buildQueryString(params: Record<string, QueryValue>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null || item === "") {
          return;
        }
        searchParams.append(key, String(item));
      });
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

