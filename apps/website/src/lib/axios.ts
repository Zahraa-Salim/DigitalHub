// File: src/lib/axios.ts
// Purpose: Low-level library/client configuration used by higher-level modules.
// If you change this file: Changing connection settings or exported client behavior can break all dependent API/data operations.
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

export default axiosInstance;

