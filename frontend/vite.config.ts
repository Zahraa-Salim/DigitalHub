// File: frontend/vite.config.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
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
