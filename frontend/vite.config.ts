// File: frontend/vite.config.ts
// Purpose: Contains frontend code for vite config.
// It supports this part of the user interface and page behavior.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@dashboard': path.resolve(__dirname, 'src/dashboard'),
    },
  },
  server: {
    // Bind dual-stack so both localhost (often ::1) and LAN IPv4 work.
    host: '::',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '::',
    port: 4173,
    strictPort: true,
  },
})

