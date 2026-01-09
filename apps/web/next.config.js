/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mobazha/ui', '@mobazha/core'],

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
        // 静态资源缓存
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // JS/CSS 缓存
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API 响应不缓存
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  // 注意：API 代理由服务器 nginx 处理（直接代理 /api, /v1, /info 路径）
  // 不需要 Next.js rewrites
};

module.exports = nextConfig;
