/**
 * Vite 开发环境路由配置
 * 映射 Next.js App Router 结构到 React Router
 *
 * 路由分为两类：
 * - 公开路由：无需登录即可访问
 * - 私有路由：需要登录才能访问，使用 ProtectedRoute 包装
 */
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';

// 加载中的占位组件
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

// 懒加载包装器（公开路由）
function lazyPage(importFn: () => Promise<{ default: ComponentType<unknown> }>) {
  const LazyComponent = lazy(importFn);
  return (
    <Suspense fallback={<PageLoading />}>
      <LazyComponent />
    </Suspense>
  );
}

// 懒加载包装器（私有路由，需要登录）
function protectedPage(importFn: () => Promise<{ default: ComponentType<unknown> }>) {
  const LazyComponent = lazy(importFn);
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoading />}>
        <LazyComponent />
      </Suspense>
    </ProtectedRoute>
  );
}

// 路由配置
const routes: RouteObject[] = [
  // ============================================
  // 公开路由（无需登录）
  // ============================================

  // 首页
  { path: '/', element: lazyPage(() => import('./app/page')) },

  // 认证相关
  { path: '/login', element: lazyPage(() => import('./app/login/page')) },
  { path: '/offline', element: lazyPage(() => import('./app/offline/page')) },

  // 新用户引导（需登录但不需要 profile）
  { path: '/onboarding', element: protectedPage(() => import('./app/onboarding/page')) },

  // 搜索
  { path: '/search', element: lazyPage(() => import('./app/search/page')) },

  // 店铺（公开浏览）
  { path: '/store/:peerId', element: lazyPage(() => import('./app/store/[peerId]/page')) },

  // 产品详情（公开浏览）
  { path: '/product/:slug', element: lazyPage(() => import('./app/product/[slug]/page')) },

  // 市场列表和详情（公开浏览）
  { path: '/marketplace', element: lazyPage(() => import('./app/marketplace/page')) },
  { path: '/marketplace/:slug', element: lazyPage(() => import('./app/marketplace/[slug]/page')) },

  // 仲裁员列表（公开浏览）
  { path: '/moderators', element: lazyPage(() => import('./app/moderators/page')) },
  { path: '/moderators/:id', element: lazyPage(() => import('./app/moderators/[id]/page')) },

  // ============================================
  // 私有路由（需要登录）
  // ============================================

  // 购物车
  { path: '/cart', element: protectedPage(() => import('./app/cart/page')) },

  // 结账流程
  { path: '/checkout', element: protectedPage(() => import('./app/checkout/page')) },
  {
    path: '/checkout/moderator',
    element: protectedPage(() => import('./app/checkout/moderator/page')),
  },
  {
    path: '/checkout/payment-method',
    element: protectedPage(() => import('./app/checkout/payment-method/page')),
  },

  // 商品管理
  { path: '/listing/new', element: protectedPage(() => import('./app/listing/new/page')) },
  {
    path: '/listing/edit/:slug',
    element: protectedPage(() => import('./app/listing/edit/[slug]/page')),
  },
  { path: '/listing/import', element: protectedPage(() => import('./app/listing/import/page')) },

  // 市场管理（需要登录）
  {
    path: '/marketplace/:slug/admin',
    element: protectedPage(() => import('./app/marketplace/[slug]/admin/page')),
  },
  {
    path: '/marketplace/:slug/admin/applications',
    element: protectedPage(() => import('./app/marketplace/[slug]/admin/applications/page')),
  },
  {
    path: '/marketplace/:slug/admin/products',
    element: protectedPage(() => import('./app/marketplace/[slug]/admin/products/page')),
  },
  {
    path: '/marketplace/:slug/sell',
    element: protectedPage(() => import('./app/marketplace/[slug]/sell/page')),
  },

  // 用户中心
  { path: '/me', element: protectedPage(() => import('./app/me/page')) },
  { path: '/profile', element: protectedPage(() => import('./app/profile/page')) },

  // 仲裁案例管理
  { path: '/moderator/cases', element: protectedPage(() => import('./app/moderator/cases/page')) },
  {
    path: '/moderator/cases/:orderId',
    element: protectedPage(() => import('./app/moderator/cases/[orderId]/page')),
  },

  // 通知
  { path: '/notifications', element: protectedPage(() => import('./app/notifications/page')) },

  // 订单
  { path: '/orders', element: protectedPage(() => import('./app/orders/page')) },
  { path: '/orders/:orderId', element: protectedPage(() => import('./app/orders/[orderId]/page')) },

  // 支付
  { path: '/payment', element: protectedPage(() => import('./app/payment/page')) },

  // RWA 仪表盘
  { path: '/rwa-dashboard', element: protectedPage(() => import('./app/rwa-dashboard/page')) },

  // 设置 - 主页面
  { path: '/settings', element: protectedPage(() => import('./app/settings/page')) },
  {
    path: '/settings/account',
    element: protectedPage(() => import('./app/settings/account/page')),
  },
  {
    path: '/settings/addresses',
    element: protectedPage(() => import('./app/settings/addresses/page')),
  },
  {
    path: '/settings/advanced',
    element: protectedPage(() => import('./app/settings/advanced/page')),
  },
  {
    path: '/settings/blocked',
    element: protectedPage(() => import('./app/settings/blocked/page')),
  },
  {
    path: '/settings/blocked-users',
    element: protectedPage(() => import('./app/settings/blocked-users/page')),
  },
  {
    path: '/settings/chat-encryption',
    element: protectedPage(() => import('./app/settings/chat-encryption/page')),
  },
  {
    path: '/settings/general',
    element: protectedPage(() => import('./app/settings/general/page')),
  },
  { path: '/settings/keys', element: protectedPage(() => import('./app/settings/keys/page')) },
  {
    path: '/settings/moderation',
    element: protectedPage(() => import('./app/settings/moderation/page')),
  },
  {
    path: '/settings/moderator',
    element: protectedPage(() => import('./app/settings/moderator/page')),
  },
  {
    path: '/settings/page-profile',
    element: protectedPage(() => import('./app/settings/page-profile/page')),
  },
  {
    path: '/settings/privacy',
    element: protectedPage(() => import('./app/settings/privacy/page')),
  },
  {
    path: '/settings/receiving',
    element: protectedPage(() => import('./app/settings/receiving/page')),
  },
  { path: '/settings/store', element: protectedPage(() => import('./app/settings/store/page')) },
  {
    path: '/settings/store/shipping',
    element: protectedPage(() => import('./app/settings/store/shipping/page')),
  },

  // 设置 - 访问请求
  {
    path: '/settings/access-requests',
    element: protectedPage(() => import('./app/settings/access-requests/page')),
  },

  // 设置 - 访问控制
  {
    path: '/settings/access-control',
    element: protectedPage(() => import('./app/settings/access-control/page')),
  },
  {
    path: '/settings/access-control/privacy',
    element: protectedPage(() => import('./app/settings/access-control/privacy/page')),
  },
  {
    path: '/settings/access-control/requests',
    element: protectedPage(() => import('./app/settings/access-control/requests/page')),
  },
  {
    path: '/settings/access-control/product-groups',
    element: protectedPage(() => import('./app/settings/access-control/product-groups/page')),
  },
  {
    path: '/settings/access-control/product-groups/:groupId',
    element: protectedPage(
      () => import('./app/settings/access-control/product-groups/[groupId]/page')
    ),
  },
  {
    path: '/settings/access-control/product-groups/:groupId/authorization',
    element: protectedPage(
      () => import('./app/settings/access-control/product-groups/[groupId]/authorization/page')
    ),
  },
  {
    path: '/settings/access-control/user-groups',
    element: protectedPage(() => import('./app/settings/access-control/user-groups/page')),
  },
  {
    path: '/settings/access-control/user-groups/:groupId/members',
    element: protectedPage(
      () => import('./app/settings/access-control/user-groups/[groupId]/members/page')
    ),
  },

  // 设置 - 产品分组
  {
    path: '/settings/product-groups',
    element: protectedPage(() => import('./app/settings/product-groups/page')),
  },
  {
    path: '/settings/product-groups/:groupId/authorization',
    element: protectedPage(
      () => import('./app/settings/product-groups/[groupId]/authorization/page')
    ),
  },

  // 设置 - 用户分组
  {
    path: '/settings/user-groups',
    element: protectedPage(() => import('./app/settings/user-groups/page')),
  },
  {
    path: '/settings/user-groups/:groupId/members',
    element: protectedPage(() => import('./app/settings/user-groups/[groupId]/members/page')),
  },

  // 钱包
  { path: '/wallet', element: protectedPage(() => import('./app/wallet/page')) },
  { path: '/wallet/:symbol', element: protectedPage(() => import('./app/wallet/[symbol]/page')) },

  // 开发工具（仅开发环境）
  ...(process.env.NODE_ENV === 'development'
    ? [
        {
          path: '/dev/api-explorer',
          element: lazyPage(() => import('./app/dev/api-explorer/page')),
        },
      ]
    : []),
];

// 导出路由配置数组（供 main.tsx 使用）
export { routes };

// 也导出完整的 router（备用）
export const router = createBrowserRouter(routes);
