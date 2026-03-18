import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: 'manifest.json',
      watchFilePaths: ['src/**/*'],
    }),
  ],
  resolve: {
    alias: {
      '@mobazha/core': path.resolve(__dirname, '../../packages/core'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
