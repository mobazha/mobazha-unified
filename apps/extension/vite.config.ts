import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import path from 'path';

const webSrc = path.resolve(__dirname, '../web/src');

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: 'manifest.json',
      watchFilePaths: ['src/**/*'],
      htmlViteConfig: {
        build: {
          rollupOptions: {
            output: {
              manualChunks(id: string) {
                if (id.includes('node_modules')) {
                  if (id.includes('lucide-react')) return 'vendor-icons';
                  if (id.includes('matrix-js-sdk') || id.includes('matrix_sdk_crypto_wasm'))
                    return 'vendor-matrix';
                }
                if (id.includes('packages/core/')) return 'core';
              },
            },
          },
        },
      },
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    alias: [
      { find: '@', replacement: webSrc },
      {
        find: /^@mobazha\/core$/,
        replacement: path.resolve(__dirname, '../../packages/core/index.ts'),
      },
      {
        find: /^@mobazha\/core\/(.*)/,
        replacement: path.resolve(__dirname, '../../packages/core/$1'),
      },
      {
        find: /^@mobazha\/ui$/,
        replacement: path.resolve(__dirname, '../../packages/ui/index.ts'),
      },
      {
        find: /^@mobazha\/ui\/(.*)/,
        replacement: path.resolve(__dirname, '../../packages/ui/$1'),
      },
      { find: 'next/link', replacement: path.resolve(webSrc, 'compat/link.tsx') },
      { find: 'next/navigation', replacement: path.resolve(webSrc, 'compat/navigation.tsx') },
      { find: 'next/image', replacement: path.resolve(webSrc, 'compat/image.tsx') },
      { find: 'next/font/google', replacement: path.resolve(webSrc, 'compat/font-google.ts') },
    ],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.NEXT_PUBLIC_ENV_MODE': JSON.stringify('test'),
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_MATRIX_HOMESERVER': JSON.stringify('https://matrix.org'),
    'process.env.NEXT_PUBLIC_MATRIX_ENABLED': JSON.stringify('false'),
    'process.env.NEXT_PUBLIC_USE_MOCK_DATA': JSON.stringify('false'),
    'process.env.NEXT_PUBLIC_API_BASE_URL': JSON.stringify('https://test-new.mobazha.org'),
    'process.env.NEXT_PUBLIC_AUTH_MODE': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_CASDOOR_URL': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_SAAS_URL': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME': JSON.stringify(''),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  css: {
    postcss: './postcss.config.cjs',
  },
});
