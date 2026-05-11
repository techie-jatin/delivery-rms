import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * vite.config.js
 *
 * base: '/delivery-rms/' — matches your GitHub Pages repo name.
 * Change this to '/' if you deploy to a custom domain.
 *
 * To find your repo name: it's the part after github.com/<username>/
 */
export default defineConfig({
  plugins: [react()],
  base: '/delivery-rms/',
  server: {
    port: 5173,
    // Proxy API calls to backend during local dev
    // so we don't need CORS config in dev
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
