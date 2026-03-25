import { defineConfig, loadEnv } from 'vite';
import type { Plugin, ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Strip WWW-Authenticate header from proxy responses so the browser
 * doesn't show its native Basic Auth dialog. The frontend handles
 * 401 responses programmatically via its own login UI.
 */
function withStripWwwAuth(opts: ProxyOptions): ProxyOptions {
  return {
    ...opts,
    configure: (proxy, _options) => {
      proxy.on('proxyRes', proxyRes => {
        delete proxyRes.headers['www-authenticate'];
      });
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise(resolve => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => resolve(data));
  });
}

/**
 * Vite plugin: serve .wasm files with correct MIME type.
 * Required by @matrix-org/matrix-sdk-crypto-wasm which loads WASM at runtime.
 */
function wasmMimePlugin(): Plugin {
  return {
    name: 'wasm-mime-type',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        next();
      });
    },
  };
}

/**
 * Vite plugin: AI proxy endpoint at /internal/ai/generate.
 * Mirrors the Next.js API route, sharing core logic from src/server/aiHandler.ts.
 */
function aiProxyPlugin(): Plugin {
  return {
    name: 'ai-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/internal/ai/generate',
        async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'AI service not configured. Set OPENAI_API_KEY environment variable.',
              })
            );
            return;
          }

          let body: unknown;
          try {
            const raw = await readBody(req);
            body = JSON.parse(raw);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid request body' }));
            return;
          }

          const { handleAiRequest } = await import('./src/server/aiHandler');
          const result = await handleAiRequest(body as Parameters<typeof handleAiRequest>[0], {
            apiKey,
            model: process.env.OPENAI_MODEL || 'gpt-4o',
            baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          });

          res.writeHead(result.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result.error ? { error: result.error } : result.data));
        }
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  // 加载 .env.local 等环境文件中的 NEXT_PUBLIC_* 和 OPENAI_* 变量
  const env = loadEnv(mode, process.cwd(), ['NEXT_PUBLIC_', 'OPENAI_']);
  const apiBase = env.NEXT_PUBLIC_API_BASE_URL || 'https://miniapptest.mobazha.org';

  // 注入 AI 相关环境变量到 process.env（供 aiHandler 使用）
  if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  if (env.OPENAI_MODEL) process.env.OPENAI_MODEL = env.OPENAI_MODEL;
  if (env.OPENAI_BASE_URL) process.env.OPENAI_BASE_URL = env.OPENAI_BASE_URL;

  return {
    plugins: [react(), wasmMimePlugin(), aiProxyPlugin()],
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
      'process.env.NEXT_PUBLIC_SAAS_URL': JSON.stringify(env.NEXT_PUBLIC_SAAS_URL || ''),
      'process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME': JSON.stringify(
        env.NEXT_PUBLIC_BASIC_AUTH_USERNAME || ''
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
        {
          find: 'next/font/google',
          replacement: path.resolve(__dirname, './src/compat/font-google.ts'),
        },
      ],
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      allowedHosts: ['miniappdev.mobazha.org'],
      ...(mode === 'miniappdev' && {
        hmr: {
          host: 'miniappdev.mobazha.org',
          protocol: 'wss',
          clientPort: 443,
        },
      }),
      proxy: {
        '/v1': withStripWwwAuth({
          target: apiBase,
          changeOrigin: true,
        }),
        '/ws': {
          target: apiBase,
          changeOrigin: true,
          ws: true,
        },
        '/buyer-api': {
          target: env.NEXT_PUBLIC_SAAS_URL || apiBase,
          changeOrigin: true,
          ws: true,
          rewrite: (path: string) => path.replace(/^\/buyer-api/, ''),
        },
        '/info': withStripWwwAuth({
          target: env.NEXT_PUBLIC_INFO_API_URL || apiBase,
          changeOrigin: true,
          rewrite: env.NEXT_PUBLIC_INFO_API_URL
            ? (p: string) => p.replace(/^\/info/, '')
            : undefined,
        }),
        '/platform': withStripWwwAuth({
          target: apiBase,
          changeOrigin: true,
        }),
        '/_matrix': {
          target: env.NEXT_PUBLIC_MATRIX_HOMESERVER_INTERNAL || 'http://localhost:18008',
          changeOrigin: true,
        },
        '/_synapse': {
          target: env.NEXT_PUBLIC_MATRIX_HOMESERVER_INTERNAL || 'http://localhost:18008',
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
