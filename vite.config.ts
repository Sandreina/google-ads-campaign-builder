import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Vitest reads this `test` block at runtime; it is not part of Vite's own
  // config type, so we suppress the unknown-key error here.
  // @ts-expect-error vitest config is merged at runtime
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
