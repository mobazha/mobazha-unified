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
 * Serves `/runtime-config.js` in dev when `NEXT_PUBLIC_ENV_MODE=standalone`, matching
 * mobazha3.0 embedded `internal/embedded/frontend/server.go` so `packages/core/config/env.ts`
 * `applyRuntimeConfig()` runs and sets `auth.mode` + API base URLs before React mounts.
 * Without this, Vite returns 404 for the script in index.html and the app can fall back to
 * SaaS homepage even when the shell passes standalone env vars.
 */
/**
 * Strips external resources from index.html for Outpost privacy builds:
 * - Google Fonts preconnect + stylesheet links
 * - Telegram SDK conditional loader script
 * - Any <script src> pointing to external domains
 */
function outpostHtmlStripPlugin(): Plugin {
  return {
    name: 'outpost-html-strip',
    transformIndexHtml(html) {
      return (
        html
          // Remove Google Fonts links
          .replace(/\s*<link[^>]*fonts\.googleapis\.com[^>]*\/?\s*>/g, '')
          .replace(/\s*<link[^>]*fonts\.gstatic\.com[^>]*\/?\s*>/g, '')
          // Remove Telegram SDK loader script block
          .replace(/\s*<script>\s*var _tg[\s\S]*?telegram-web-app\.js[\s\S]*?<\/script>/g, '')
      );
    },
  };
}

/**
 * Outpost resolveId plugin — intercepts relative imports inside monorepo
 * packages that bypass Vite alias (aliases only match raw specifiers).
 * Maps resolved absolute paths to their _outpost stub counterparts.
 */
function outpostResolvePlugin(): Plugin {
  const chatStub = path.resolve(__dirname, './src/stubs/chat-components.ts');
  const chatSystemStub = path.resolve(__dirname, './src/components/ChatSystem_outpost.tsx');
  const matrixInitStub = path.resolve(
    __dirname,
    '../../packages/core/hooks/useMatrixInit_outpost.ts'
  );

  const rewrites: Array<{ test: RegExp; replacement: string }> = [
    {
      test: /\/packages\/core\/providers\/AppKitProvider\.tsx$/,
      replacement: path.resolve(
        __dirname,
        '../../packages/core/providers/AppKitProvider_outpost.tsx'
      ),
    },
    {
      test: /\/packages\/core\/config\/appkit\.ts$/,
      replacement: path.resolve(__dirname, '../../packages/core/config/appkit_outpost.ts'),
    },
    {
      test: /\/src\/components\/DiscordActivityProvider\/DiscordActivityProvider\.tsx$/,
      replacement: path.resolve(__dirname, './src/components/DiscordActivityProvider_outpost.tsx'),
    },
    {
      test: /\/src\/components\/Payment\/StripePaymentForm\.tsx$/,
      replacement: path.resolve(
        __dirname,
        './src/components/Payment/StripePaymentForm_outpost.tsx'
      ),
    },
    // --- Matrix / Chat isolation for Outpost ---
    {
      test: /\/packages\/core\/hooks\/useMatrixInit\.ts$/,
      replacement: matrixInitStub,
    },
    {
      test: /\/src\/components\/ChatSystem\/(index\.ts|ChatSystem\.tsx|ChatSystemLazy\.tsx)$/,
      replacement: chatSystemStub,
    },
    {
      test: /\/src\/components\/Chat\/[^/]+\.(ts|tsx)$/,
      replacement: chatStub,
    },
    {
      test: /\/src\/components\/ChatDrawer\/(index\.ts|ChatDrawer\.tsx|NewChatDialog\.tsx|RoomSettingsPanel\.tsx|VerificationDialog\.tsx)$/,
      replacement: chatStub,
    },
    {
      test: /\/src\/components\/ChatDrawer\/hooks\/[^/]+\.(ts|tsx)$/,
      replacement: chatStub,
    },
    {
      test: /\/src\/components\/ChatFloatingButton\/[^/]+\.(ts|tsx)$/,
      replacement: chatStub,
    },
    // Redirect the full Matrix client to a no-op stub — prevents the real
    // MatrixClientService from being bundled even when imported via barrel exports.
    {
      test: /\/packages\/core\/services\/matrix\/client\.ts$/,
      replacement: path.resolve(__dirname, '../../packages/core/services/matrix/client_outpost.ts'),
    },
    {
      test: /\/packages\/core\/services\/matrix\/index\.ts$/,
      replacement: path.resolve(__dirname, '../../packages/core/services/matrix/index_outpost.ts'),
    },
    // Redirect chat page to a no-op stub
    {
      test: /\/src\/app\/chat\/page\.tsx$/,
      replacement: path.resolve(__dirname, './src/app/chat/page_outpost.tsx'),
    },
  ];

  return {
    name: 'outpost-resolve',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      for (const { test, replacement } of rewrites) {
        if (test.test(resolved.id)) {
          return replacement;
        }
      }
      return null;
    },
  };
}

function standaloneRuntimeConfigPlugin(env: Record<string, string>): Plugin {
  const buildTarget = env.VITE_BUILD_TARGET || 'default';
  const isOutpost = buildTarget === 'outpost';

  return {
    name: 'standalone-runtime-config',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/runtime-config.js') {
          next();
          return;
        }
        if (env.NEXT_PUBLIC_ENV_MODE !== 'standalone' && !isOutpost) {
          next();
          return;
        }
        const saasUrl = env.NEXT_PUBLIC_SAAS_URL || '';
        const payload: Record<string, unknown> = {
          authMode: 'standalone',
        };
        if (saasUrl) payload.saasUrl = saasUrl;
        if (isOutpost) {
          payload.outpostMode = true;
          payload.disableExternalResources = true;
        }
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(`window.__RUNTIME_CONFIG__=${JSON.stringify(payload)};`);
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
  const env = loadEnv(mode, process.cwd(), ['NEXT_PUBLIC_', 'OPENAI_', 'VITE_']);
  const apiBase = env.NEXT_PUBLIC_API_BASE_URL || 'https://miniapptest.mobazha.org';
  const buildTarget = env.VITE_BUILD_TARGET || 'default';
  const isOutpost = buildTarget === 'outpost';

  // 注入 AI 相关环境变量到 process.env（供 aiHandler 使用）
  if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  if (env.OPENAI_MODEL) process.env.OPENAI_MODEL = env.OPENAI_MODEL;
  if (env.OPENAI_BASE_URL) process.env.OPENAI_BASE_URL = env.OPENAI_BASE_URL;

  return {
    plugins: [
      react(),
      standaloneRuntimeConfigPlugin(env),
      ...(!isOutpost ? [aiProxyPlugin()] : []),
      ...(isOutpost ? [outpostHtmlStripPlugin(), outpostResolvePlugin()] : []),
    ],
    // 定义全局变量，兼容 Next.js 环境变量
    // 注意：必须单独定义每个 process.env.XXX，而不是替换整个 process.env 对象
    // 否则 process.env.NODE_ENV 会变成 '{"NODE_ENV":...}'.NODE_ENV，返回 undefined
    define: {
      __OUTPOST__: JSON.stringify(isOutpost),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.NEXT_PUBLIC_ENV_MODE': JSON.stringify(
        isOutpost ? 'standalone' : env.NEXT_PUBLIC_ENV_MODE || 'test'
      ),
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(env.NEXT_PUBLIC_API_URL || ''),
      'process.env.NEXT_PUBLIC_MATRIX_HOMESERVER': JSON.stringify(
        isOutpost ? '' : env.NEXT_PUBLIC_MATRIX_HOMESERVER || 'https://matrix.org'
      ),
      'process.env.NEXT_PUBLIC_MATRIX_ENABLED': JSON.stringify(
        isOutpost ? 'false' : env.NEXT_PUBLIC_MATRIX_ENABLED || 'true'
      ),
      'process.env.NEXT_PUBLIC_USE_MOCK_DATA': JSON.stringify(
        env.NEXT_PUBLIC_USE_MOCK_DATA || 'false'
      ),
      'process.env.NEXT_PUBLIC_API_BASE_URL': JSON.stringify(apiBase),
      'process.env.NEXT_PUBLIC_AUTH_MODE': JSON.stringify(env.NEXT_PUBLIC_AUTH_MODE || ''),
      'process.env.NEXT_PUBLIC_CASDOOR_URL': JSON.stringify(
        isOutpost ? '' : env.NEXT_PUBLIC_CASDOOR_URL || ''
      ),
      'process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID': JSON.stringify(
        isOutpost ? '' : env.NEXT_PUBLIC_CASDOOR_CLIENT_ID || ''
      ),
      'process.env.NEXT_PUBLIC_SAAS_URL': JSON.stringify(
        isOutpost ? '' : env.NEXT_PUBLIC_SAAS_URL || ''
      ),
      'process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE': JSON.stringify(
        env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE || ''
      ),
      'process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME': JSON.stringify(
        env.NEXT_PUBLIC_BASIC_AUTH_USERNAME || ''
      ),
    },
    resolve: {
      alias: [
        // Outpost build-time module replacements — physically remove forbidden code
        ...(isOutpost
          ? [
              {
                find: /^@\/components\/OuterProviders$/,
                replacement: path.resolve(__dirname, './src/components/OuterProviders_outpost.tsx'),
              },
              {
                find: /^@\/components\/ChatSystem$/,
                replacement: path.resolve(__dirname, './src/components/ChatSystem_outpost.tsx'),
              },
              {
                find: /^@\/components\/admin\/AdminLoginForm$/,
                replacement: path.resolve(
                  __dirname,
                  './src/components/admin/AdminLoginForm_outpost.tsx'
                ),
              },
              {
                find: /^@\/components\/AppKitProvider$/,
                replacement: path.resolve(__dirname, './src/components/AppKitProvider_outpost.tsx'),
              },
              // Intercept packages/core internal relative imports to AppKitProvider
              {
                find: new RegExp(
                  path
                    .resolve(__dirname, '../../packages/core/providers/AppKitProvider')
                    .replace(/[/\\]/g, '[/\\\\]') + '(\\.tsx)?$'
                ),
                replacement: path.resolve(
                  __dirname,
                  '../../packages/core/providers/AppKitProvider_outpost.tsx'
                ),
              },
              // Intercept packages/core/config/appkit (contains APPKIT_PROJECT_ID with reown cloud URL)
              {
                find: new RegExp(
                  path
                    .resolve(__dirname, '../../packages/core/config/appkit')
                    .replace(/[/\\]/g, '[/\\\\]') + '(\\.ts)?$'
                ),
                replacement: path.resolve(
                  __dirname,
                  '../../packages/core/config/appkit_outpost.ts'
                ),
              },
              {
                find: /^@\/components\/DiscordActivityProvider$/,
                replacement: path.resolve(
                  __dirname,
                  './src/components/DiscordActivityProvider_outpost.tsx'
                ),
              },
              // Intercept packages/core internal imports to DiscordActivityProvider
              {
                find: new RegExp(
                  path
                    .resolve(__dirname, '../../packages/core/providers/DiscordActivityProvider')
                    .replace(/[/\\]/g, '[/\\\\]') + '(\\.tsx)?$'
                ),
                replacement: path.resolve(
                  __dirname,
                  './src/components/DiscordActivityProvider_outpost.tsx'
                ),
              },
              // Intercept the barrel re-export inside DiscordActivityProvider/index.ts
              {
                find: new RegExp(
                  path
                    .resolve(
                      __dirname,
                      './src/components/DiscordActivityProvider/DiscordActivityProvider'
                    )
                    .replace(/[/\\]/g, '[/\\\\]') + '(\\.tsx)?$'
                ),
                replacement: path.resolve(
                  __dirname,
                  './src/components/DiscordActivityProvider_outpost.tsx'
                ),
              },
              // Stripe SDK — replace StripePaymentForm with noop stub
              {
                find: /^@\/components\/Payment\/StripePaymentForm$/,
                replacement: path.resolve(
                  __dirname,
                  './src/components/Payment/StripePaymentForm_outpost.tsx'
                ),
              },
              {
                find: /^\.\/StripePaymentForm$/,
                replacement: path.resolve(
                  __dirname,
                  './src/components/Payment/StripePaymentForm_outpost.tsx'
                ),
              },
              {
                find: /^@\/components\/TGMiniAppProvider$/,
                replacement: path.resolve(
                  __dirname,
                  './src/components/TGMiniAppProvider_outpost.tsx'
                ),
              },
              // NPM-level package stubs — prevent any transitive import from pulling in forbidden SDKs.
              // Regex must match the ENTIRE specifier (.*) so the replacement is the sole resolved path.
              {
                find: /^@reown\/appkit.*/,
                replacement: path.resolve(__dirname, './src/stubs/empty-module.ts'),
              },
              {
                find: /^@walletconnect\/.*/,
                replacement: path.resolve(__dirname, './src/stubs/empty-module.ts'),
              },
              {
                find: /^@discord\/embedded-app-sdk.*/,
                replacement: path.resolve(__dirname, './src/stubs/empty-module.ts'),
              },
              {
                find: /^@stripe\/stripe-js.*/,
                replacement: path.resolve(__dirname, './src/stubs/empty-module.ts'),
              },
              {
                find: /^@stripe\/react-stripe-js.*/,
                replacement: path.resolve(__dirname, './src/stubs/empty-module.ts'),
              },
            ]
          : []),
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
          find: 'next/dynamic',
          replacement: path.resolve(__dirname, './src/compat/dynamic.tsx'),
        },
        {
          find: 'next/font/google',
          replacement: path.resolve(__dirname, './src/compat/font-google.ts'),
        },
      ],
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      allowedHosts: ['miniappdev.mobazha.org', '.mobaza.org'],
      ...(mode === 'miniappdev' && {
        hmr: {
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
