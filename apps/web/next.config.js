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

  // 输出配置
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

  // API 代理配置 (解决 CORS 问题)
  //
  // API 路径分类（参考后端 gateway.go 和移动端 api/const.js）：
  // - /api/*: Hosting 服务接口 (如 /api/signin, /api/userinfo) - 不需要 /v1
  // - /v1/ob/*: 节点代理接口 (如 /v1/ob/profile, /v1/ob/listing) - 需要 /v1
  // - /info/*: 搜索接口 (如 /info/api/listings)
  // - /ws: WebSocket
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://miniapptest.mobazha.org';
    return [
      // Hosting 服务 API 代理 (/api/*)
      // 如 /api/signin, /api/userinfo - 不需要 /v1 前缀
      {
        source: '/proxy/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      // 节点 API 代理 (/v1/ob/*)
      // 如 /v1/ob/profile, /v1/ob/listing
      {
        source: '/proxy/v1/:path*',
        destination: `${apiBase}/v1/:path*`,
      },
      // Info/Search API 代理 (/info/*)
      {
        source: '/proxy/info/:path*',
        destination: `${apiBase}/info/:path*`,
      },
      // WebSocket 代理
      {
        source: '/proxy/ws',
        destination: `${apiBase}/ws`,
      },
    ];
  },
};

module.exports = nextConfig;
