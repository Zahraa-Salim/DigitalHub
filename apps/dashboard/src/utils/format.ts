export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function includesQuery(input: string, query: string): boolean {
  if (!query.trim()) {
    return true;
  }
  return input.toLowerCase().includes(query.trim().toLowerCase());
}
