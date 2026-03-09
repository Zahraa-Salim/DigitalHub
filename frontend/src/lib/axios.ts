// File: frontend/src/lib/axios.ts
// What this code does:
// 1) Provides shared frontend helpers and API client utilities.
// 2) Centralizes fetch, parsing, and cross-page helper logic.
// 3) Reduces duplicated behavior across pages/components.
// 4) Exports reusable functions consumed by app modules.
import axios from "axios";

const resolveFallbackApiUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5000";
  }
  const hostname = window.location.hostname || "localhost";
  const normalizedHost = hostname.includes(":") && !hostname.startsWith("[")
    ? `[${hostname}]`
    : hostname;
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${normalizedHost}:5000`;
};

const axiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || resolveFallbackApiUrl()).replace(/\/$/, ""),
  withCredentials: false,
});

export default axiosInstance;
