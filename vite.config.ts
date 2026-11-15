import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config.
 * The app is served at the root of its custom domain (https://golf.sogra.es/), so `base` is `/`.
 * Override with VITE_BASE (e.g. VITE_BASE=/28-0-golf-game/) to serve it under a sub-path.
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  test: { environment: 'node' },
} as any);
