export function resolveFallbackApiUrl(): string {
  if (typeof window === "undefined") return "http://localhost:5000";
  const hostname = window.location.hostname || "localhost";
  const normalizedHost = hostname.includes(":") && !hostname.startsWith("[")
    ? `[${hostname}]`
    : hostname;
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${normalizedHost}:5000`;
}
