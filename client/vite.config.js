import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server forwards /api calls to Express, so the browser only talks to one origin.
// That keeps the HTTP-only auth cookie simple (no cross-site cookie settings needed).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000' },
  },
});
