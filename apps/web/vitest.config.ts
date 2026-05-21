import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./lib/test/setup.ts'],
    globals: true,
    exclude: ['node_modules', 'e2e'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
