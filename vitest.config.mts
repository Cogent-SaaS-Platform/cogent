import { defineConfig } from 'vitest/config';
import path from 'path';

try {
  const proc = process as unknown as { loadEnvFile?: (path?: string) => void };
  if (typeof proc.loadEnvFile === 'function') {
    proc.loadEnvFile('.env.local');
  }
} catch {
  // Ignore if .env.local is missing
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    hookTimeout: 30000,
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@/modules': path.resolve(import.meta.dirname, './src/modules'),
      '@/shared': path.resolve(import.meta.dirname, './src/shared'),
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
