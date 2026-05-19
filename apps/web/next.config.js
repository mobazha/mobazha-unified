// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),

  transpilePackages: ['@mobazha/ui', '@mobazha/core'],

  // 禁用开发指示器（左下角的 "N" 图标）
  devIndicators: false,

  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.mobazha.com',
      },
      {
        protocol: 'https',
        hostname: '*.mobazha.org',
      },
      {
        protocol: 'http',
        hostname: '*.mobazha.org',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      // Matrix media server
      {
        protocol: 'https',
        hostname: 'matrix.mobazha.org',
      },
      // Fulfillment provider CDNs (supply chain imports)
      {
        protocol: 'https',
        hostname: '*.printful.com',
      },
    ],
    // 支持的图片格式
    formats: ['image/avif', 'image/webp'],
    // 响应式图片尺寸
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 图片缓存时间 (秒)
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 天
  },

  // 生产环境优化
  compiler: {
    // 移除 console.log (生产环境)
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 输出配置 - standalone 模式，支持动态路由
  output: 'standalone',

  // 压缩
  compress: true,

  // 生成源码映射 (仅开发)
  productionBrowserSourceMaps: false,

  // Headers 配置 (缓存策略)
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
        ],
      },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        source: '/runtime-config.js',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }],
      },
      {
        source: '/((?!embed|_next/static|icons).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },

  // API 代理：由 src/proxy.ts 处理（替代 rewrites）
  // proxy 代理 /v1/*, /api/*, /info/* 到后端，并剥离 WWW-Authenticate header
  // 防止浏览器弹出原生 Basic Auth 登录框（等效于 Vite 的 withStripWwwAuth）
  // 生产环境由 nginx 处理代理
};

module.exports = nextConfig;
