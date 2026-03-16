// File: frontend/src/lib/axios.ts
// Purpose: Creates the shared axios client configuration used by the frontend.
// It keeps base request behavior and interceptors in one place.

import axios from "axios";
import { resolveFallbackApiUrl } from "./resolveApiUrl";

const axiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || resolveFallbackApiUrl()).replace(/\/$/, ""),
  withCredentials: false,
});

export default axiosInstance;

