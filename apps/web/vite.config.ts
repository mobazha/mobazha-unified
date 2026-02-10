import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // 加载 .env.local 等环境文件中的 NEXT_PUBLIC_* 变量
  const env = loadEnv(mode, process.cwd(), 'NEXT_PUBLIC_');
  const apiBase = env.NEXT_PUBLIC_API_BASE_URL || 'https://miniapptest.mobazha.org';

  return {
    plugins: [react()],
    // 定义全局变量，兼容 Next.js 环境变量
    // 注意：必须单独定义每个 process.env.XXX，而不是替换整个 process.env 对象
    // 否则 process.env.NODE_ENV 会变成 '{"NODE_ENV":...}'.NODE_ENV，返回 undefined
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.NEXT_PUBLIC_ENV_MODE': JSON.stringify(env.NEXT_PUBLIC_ENV_MODE || 'test'),
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(env.NEXT_PUBLIC_API_URL || ''),
      'process.env.NEXT_PUBLIC_MATRIX_HOMESERVER': JSON.stringify(
        env.NEXT_PUBLIC_MATRIX_HOMESERVER || 'https://matrix.org'
      ),
      'process.env.NEXT_PUBLIC_MATRIX_ENABLED': JSON.stringify(
        env.NEXT_PUBLIC_MATRIX_ENABLED || 'false'
      ),
      'process.env.NEXT_PUBLIC_USE_MOCK_DATA': JSON.stringify(
        env.NEXT_PUBLIC_USE_MOCK_DATA || 'false'
      ),
      'process.env.NEXT_PUBLIC_API_BASE_URL': JSON.stringify(apiBase),
      'process.env.NEXT_PUBLIC_AUTH_MODE': JSON.stringify(env.NEXT_PUBLIC_AUTH_MODE || ''),
      'process.env.NEXT_PUBLIC_CASDOOR_URL': JSON.stringify(env.NEXT_PUBLIC_CASDOOR_URL || ''),
      'process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID': JSON.stringify(
        env.NEXT_PUBLIC_CASDOOR_CLIENT_ID || ''
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
        {
          find: /^@mobazha\/ui\/(.*)/,
          replacement: path.resolve(__dirname, '../../packages/ui/$1'),
        },
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
          target: apiBase,
          changeOrigin: true,
        },
        '/info': {
          target: apiBase,
          changeOrigin: true,
        },
        '/api': {
          target: apiBase,
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
  };
});
