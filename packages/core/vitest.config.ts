import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.d.ts', '**/index.ts'],
    },
  },
});
