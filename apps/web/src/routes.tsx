/**
 * Vite 开发环境路由配置
 * 映射 Next.js App Router 结构到 React Router
 */
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';

// 加载中的占位组件
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

// 懒加载包装器
function lazyPage(importFn: () => Promise<{ default: ComponentType<unknown> }>) {
  const LazyComponent = lazy(importFn);
  return (
    <Suspense fallback={<PageLoading />}>
      <LazyComponent />
    </Suspense>
  );
}

// 路由配置
const routes: RouteObject[] = [
  // 首页
  { path: '/', element: lazyPage(() => import('./app/page')) },

  // 购物车
  { path: '/cart', element: lazyPage(() => import('./app/cart/page')) },

  // 结账流程
  { path: '/checkout', element: lazyPage(() => import('./app/checkout/page')) },
  { path: '/checkout/moderator', element: lazyPage(() => import('./app/checkout/moderator/page')) },
  {
    path: '/checkout/payment-method',
    element: lazyPage(() => import('./app/checkout/payment-method/page')),
  },

  // 商品列表
  { path: '/listing/new', element: lazyPage(() => import('./app/listing/new/page')) },
  {
    path: '/listing/edit/:slug',
    element: lazyPage(() => import('./app/listing/edit/[slug]/page')),
  },
  { path: '/listing/import', element: lazyPage(() => import('./app/listing/import/page')) },

  // 登录
  { path: '/login', element: lazyPage(() => import('./app/login/page')) },

  // 市场
  { path: '/marketplace', element: lazyPage(() => import('./app/marketplace/page')) },
  { path: '/marketplace/:slug', element: lazyPage(() => import('./app/marketplace/[slug]/page')) },
  {
    path: '/marketplace/:slug/admin',
    element: lazyPage(() => import('./app/marketplace/[slug]/admin/page')),
  },
  {
    path: '/marketplace/:slug/admin/applications',
    element: lazyPage(() => import('./app/marketplace/[slug]/admin/applications/page')),
  },
  {
    path: '/marketplace/:slug/admin/products',
    element: lazyPage(() => import('./app/marketplace/[slug]/admin/products/page')),
  },
  {
    path: '/marketplace/:slug/sell',
    element: lazyPage(() => import('./app/marketplace/[slug]/sell/page')),
  },

  // 用户
  { path: '/me', element: lazyPage(() => import('./app/me/page')) },
  { path: '/profile', element: lazyPage(() => import('./app/profile/page')) },

  // 仲裁员
  { path: '/moderator/cases', element: lazyPage(() => import('./app/moderator/cases/page')) },
  {
    path: '/moderator/cases/:orderId',
    element: lazyPage(() => import('./app/moderator/cases/[orderId]/page')),
  },
  { path: '/moderators', element: lazyPage(() => import('./app/moderators/page')) },
  { path: '/moderators/:id', element: lazyPage(() => import('./app/moderators/[id]/page')) },

  // 通知
  { path: '/notifications', element: lazyPage(() => import('./app/notifications/page')) },

  // 离线
  { path: '/offline', element: lazyPage(() => import('./app/offline/page')) },

  // 订单
  { path: '/orders', element: lazyPage(() => import('./app/orders/page')) },
  { path: '/orders/:orderId', element: lazyPage(() => import('./app/orders/[orderId]/page')) },

  // 支付
  { path: '/payment', element: lazyPage(() => import('./app/payment/page')) },

  // 产品详情
  { path: '/product/:slug', element: lazyPage(() => import('./app/product/[slug]/page')) },

  // RWA 仪表盘
  { path: '/rwa-dashboard', element: lazyPage(() => import('./app/rwa-dashboard/page')) },

  // 搜索
  { path: '/search', element: lazyPage(() => import('./app/search/page')) },

  // 设置 - 主页面
  { path: '/settings', element: lazyPage(() => import('./app/settings/page')) },
  { path: '/settings/account', element: lazyPage(() => import('./app/settings/account/page')) },
  { path: '/settings/addresses', element: lazyPage(() => import('./app/settings/addresses/page')) },
  { path: '/settings/advanced', element: lazyPage(() => import('./app/settings/advanced/page')) },
  { path: '/settings/blocked', element: lazyPage(() => import('./app/settings/blocked/page')) },
  {
    path: '/settings/blocked-users',
    element: lazyPage(() => import('./app/settings/blocked-users/page')),
  },
  {
    path: '/settings/chat-encryption',
    element: lazyPage(() => import('./app/settings/chat-encryption/page')),
  },
  { path: '/settings/general', element: lazyPage(() => import('./app/settings/general/page')) },
  { path: '/settings/keys', element: lazyPage(() => import('./app/settings/keys/page')) },
  {
    path: '/settings/moderation',
    element: lazyPage(() => import('./app/settings/moderation/page')),
  },
  { path: '/settings/moderator', element: lazyPage(() => import('./app/settings/moderator/page')) },
  {
    path: '/settings/page-profile',
    element: lazyPage(() => import('./app/settings/page-profile/page')),
  },
  { path: '/settings/privacy', element: lazyPage(() => import('./app/settings/privacy/page')) },
  { path: '/settings/receiving', element: lazyPage(() => import('./app/settings/receiving/page')) },
  { path: '/settings/store', element: lazyPage(() => import('./app/settings/store/page')) },

  // 设置 - 访问请求
  {
    path: '/settings/access-requests',
    element: lazyPage(() => import('./app/settings/access-requests/page')),
  },

  // 设置 - 访问控制
  {
    path: '/settings/access-control',
    element: lazyPage(() => import('./app/settings/access-control/page')),
  },
  {
    path: '/settings/access-control/privacy',
    element: lazyPage(() => import('./app/settings/access-control/privacy/page')),
  },
  {
    path: '/settings/access-control/requests',
    element: lazyPage(() => import('./app/settings/access-control/requests/page')),
  },
  {
    path: '/settings/access-control/product-groups',
    element: lazyPage(() => import('./app/settings/access-control/product-groups/page')),
  },
  {
    path: '/settings/access-control/product-groups/:groupId',
    element: lazyPage(() => import('./app/settings/access-control/product-groups/[groupId]/page')),
  },
  {
    path: '/settings/access-control/product-groups/:groupId/authorization',
    element: lazyPage(
      () => import('./app/settings/access-control/product-groups/[groupId]/authorization/page')
    ),
  },
  {
    path: '/settings/access-control/user-groups',
    element: lazyPage(() => import('./app/settings/access-control/user-groups/page')),
  },
  {
    path: '/settings/access-control/user-groups/:groupId/members',
    element: lazyPage(
      () => import('./app/settings/access-control/user-groups/[groupId]/members/page')
    ),
  },

  // 设置 - 产品分组
  {
    path: '/settings/product-groups',
    element: lazyPage(() => import('./app/settings/product-groups/page')),
  },
  {
    path: '/settings/product-groups/:groupId/authorization',
    element: lazyPage(() => import('./app/settings/product-groups/[groupId]/authorization/page')),
  },

  // 设置 - 用户分组
  {
    path: '/settings/user-groups',
    element: lazyPage(() => import('./app/settings/user-groups/page')),
  },
  {
    path: '/settings/user-groups/:groupId/members',
    element: lazyPage(() => import('./app/settings/user-groups/[groupId]/members/page')),
  },

  // 店铺
  { path: '/store/:peerId', element: lazyPage(() => import('./app/store/[peerId]/page')) },

  // 钱包
  { path: '/wallet', element: lazyPage(() => import('./app/wallet/page')) },
  { path: '/wallet/:symbol', element: lazyPage(() => import('./app/wallet/[symbol]/page')) },
];

// 导出路由配置数组（供 main.tsx 使用）
export { routes };

// 也导出完整的 router（备用）
export const router = createBrowserRouter(routes);
