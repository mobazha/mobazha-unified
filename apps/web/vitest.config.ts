import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/__tests__/**', '**/dist/**'],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: /^@mobazha\/core\/(.+)$/,
        replacement: `${path.resolve(__dirname, '../../packages/core')}/$1`,
      },
      {
        find: '@mobazha/core',
        replacement: path.resolve(__dirname, '../../packages/core/index.ts'),
      },
      {
        find: '@mobazha/ui/hooks',
        replacement: path.resolve(__dirname, '../../packages/ui/hooks'),
      },
    ],
  },
});
