import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config.
 * `base` must match the GitHub Pages sub-path (https://<user>.github.io/28-0-golf-game/).
 * Override with VITE_BASE=/ for custom domains or local previews at root.
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/28-0-golf-game/',
  plugins: [react()],
  test: { environment: 'node' },
} as any);
