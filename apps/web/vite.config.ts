import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // 定义全局变量，兼容 Next.js 环境变量
  define: {
    // 定义 process.env 对象，防止未定义错误
    'process.env': JSON.stringify({
      NODE_ENV: process.env.NODE_ENV || 'development',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
      NEXT_PUBLIC_MATRIX_HOMESERVER:
        process.env.NEXT_PUBLIC_MATRIX_HOMESERVER || 'https://matrix.org',
      NEXT_PUBLIC_MATRIX_ENABLED: process.env.NEXT_PUBLIC_MATRIX_ENABLED || 'false',
      NEXT_PUBLIC_USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA || 'false',
      NEXT_PUBLIC_API_BASE_URL:
        process.env.NEXT_PUBLIC_API_BASE_URL || 'https://miniapptest.mobazha.org',
    }),
  },
  resolve: {
    alias: [
      // 项目别名
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // workspace 包 - 支持子路径导入和热加载
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
      { find: /^@mobazha\/ui\/(.*)/, replacement: path.resolve(__dirname, '../../packages/ui/$1') },
      // Next.js 兼容层
      { find: 'next/link', replacement: path.resolve(__dirname, './src/compat/link.tsx') },
      {
        find: 'next/navigation',
        replacement: path.resolve(__dirname, './src/compat/navigation.tsx'),
      },
      { find: 'next/image', replacement: path.resolve(__dirname, './src/compat/image.tsx') },
    ],
  },
  server: {
    port: 3001,
    proxy: {
      '/v1': {
        target: 'https://miniapptest.mobazha.org',
        changeOrigin: true,
      },
      '/info': {
        target: 'https://miniapptest.mobazha.org',
        changeOrigin: true,
      },
      '/api': {
        target: 'https://miniapptest.mobazha.org',
        changeOrigin: true,
      },
    },
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // CSS 配置
  css: {
    postcss: './postcss.config.js',
  },
});
