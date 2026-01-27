import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // 定义全局变量，兼容 Next.js 环境变量
  // 注意：必须单独定义每个 process.env.XXX，而不是替换整个 process.env 对象
  // 否则 process.env.NODE_ENV 会变成 '{"NODE_ENV":...}'.NODE_ENV，返回 undefined
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(process.env.NEXT_PUBLIC_API_URL || ''),
    'process.env.NEXT_PUBLIC_MATRIX_HOMESERVER': JSON.stringify(
      process.env.NEXT_PUBLIC_MATRIX_HOMESERVER || 'https://matrix.org'
    ),
    'process.env.NEXT_PUBLIC_MATRIX_ENABLED': JSON.stringify(
      process.env.NEXT_PUBLIC_MATRIX_ENABLED || 'false'
    ),
    'process.env.NEXT_PUBLIC_USE_MOCK_DATA': JSON.stringify(
      process.env.NEXT_PUBLIC_USE_MOCK_DATA || 'false'
    ),
    'process.env.NEXT_PUBLIC_API_BASE_URL': JSON.stringify(
      process.env.NEXT_PUBLIC_API_BASE_URL || 'https://miniapptest.mobazha.org'
    ),
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
