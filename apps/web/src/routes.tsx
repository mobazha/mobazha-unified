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

// Full route table — guarded by compile-time constant so Rollup eliminates all
// dynamic imports in Outpost builds (prevents chunk leakage of Stripe/PayPal/etc).
let routes: RouteObject[] = [];
if (!__OUTPOST__) {
  routes = [
    // ============================================
    // 公开路由（无需登录）
    // ============================================

    // 首页
    { path: '/', element: lazyPage(() => import('./app/page')) },

    // 认证相关
    { path: '/login', element: lazyPage(() => import('./app/login/page')) },
    { path: '/auth/saas-bridge', element: lazyPage(() => import('./app/auth/saas-bridge/page')) },
    { path: '/offline', element: lazyPage(() => import('./app/offline/page')) },

    // 新用户引导（需登录但不需要 profile）
    { path: '/onboarding', element: protectedPage(() => import('./app/onboarding/page')) },

    // 搜索
    { path: '/search', element: lazyPage(() => import('./app/search/page')) },

    // 店铺（公开浏览）
    { path: '/store/:peerId', element: lazyPage(() => import('./app/store/[peerId]/page')) },
    {
      path: '/store/:peerId/collection/:collectionId',
      element: lazyPage(() => import('./app/store/[peerId]/collection/[collectionId]/page')),
    },

    // 产品详情（公开浏览）
    { path: '/product/:slug', element: lazyPage(() => import('./app/product/[slug]/page')) },

    // 市场列表和详情（公开浏览）
    { path: '/marketplace', element: lazyPage(() => import('./app/marketplace/page')) },
    {
      path: '/marketplace/:slug',
      element: lazyPage(() => import('./app/marketplace/[slug]/page')),
    },

    // 仲裁员列表（公开浏览）
    { path: '/moderators', element: lazyPage(() => import('./app/moderators/page')) },
    { path: '/moderators/:id', element: lazyPage(() => import('./app/moderators/[id]/page')) },

    // Collections（公开浏览 — standalone 独立站）
    { path: '/collections', element: lazyPage(() => import('./app/collections/page')) },
    { path: '/collections/:id', element: lazyPage(() => import('./app/collections/[id]/page')) },

    // 政策页面（公开浏览）
    {
      path: '/policies',
      element: lazyPage(() => import('./app/policies/PoliciesLayoutVite')),
      children: [
        { path: 'privacy', element: lazyPage(() => import('./app/policies/privacy/page')) },
        { path: 'terms', element: lazyPage(() => import('./app/policies/terms/page')) },
        { path: 'shipping', element: lazyPage(() => import('./app/policies/shipping/page')) },
        { path: 'returns', element: lazyPage(() => import('./app/policies/returns/page')) },
        {
          path: 'buyer-protection',
          element: lazyPage(() => import('./app/policies/buyer-protection/page')),
        },
        { path: 'refund', element: lazyPage(() => import('./app/policies/refund/page')) },
      ],
    },

    // ============================================
    // 私有路由（需要登录）
    // ============================================

    // 购物车（公开 — 数据在 localStorage，无需登录）
    { path: '/cart', element: lazyPage(() => import('./app/cart/page')) },

    // Guest Checkout（公开 — 匿名买家直接加密货币支付）
    { path: '/guest-checkout', element: lazyPage(() => import('./app/guest-checkout/page')) },
    {
      path: '/guest-order/:orderToken',
      element: lazyPage(() => import('./app/guest-order/page')),
    },

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
    {
      path: '/checkout/confirmation',
      element: protectedPage(() => import('./app/checkout/confirmation/page')),
    },

    // 商品管理
    { path: '/listing/quick', element: protectedPage(() => import('./app/listing/quick/page')) },
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

    // 收藏/愿望单
    { path: '/wishlist', element: protectedPage(() => import('./app/wishlist/page')) },

    // 用户中心（Me 页自带 anonymous/buyer/owner 三态渲染，不需要 ProtectedRoute 硬门控）
    { path: '/me', element: lazyPage(() => import('./app/me/page')) },
    { path: '/profile', element: protectedPage(() => import('./app/profile/page')) },

    // 仲裁案例管理
    {
      path: '/moderation/cases',
      element: protectedPage(() => import('./app/moderation/cases/page')),
    },
    {
      path: '/moderation/cases/:orderId',
      element: protectedPage(() => import('./app/moderation/cases/[orderId]/page')),
    },

    // 帮助与支持
    { path: '/support', element: lazyPage(() => import('./app/support/page')) },

    // 通知
    { path: '/notifications', element: protectedPage(() => import('./app/notifications/page')) },

    // 聊天（mobile/TMA 独立页面，desktop 仍用 ChatDrawer）
    { path: '/chat', element: protectedPage(() => import('./app/chat/page')) },

    // 订单
    { path: '/orders', element: protectedPage(() => import('./app/orders/page')) },
    {
      path: '/orders/:orderId',
      element: protectedPage(() => import('./app/orders/[orderId]/page')),
    },

    // 支付
    { path: '/payment', element: protectedPage(() => import('./app/payment/page')) },

    // RWA 仪表盘
    { path: '/rwa-dashboard', element: protectedPage(() => import('./app/rwa-dashboard/page')) },

    // 设置 — 嵌套路由（共享 SettingsLayout 含侧边栏）
    {
      path: '/settings',
      element: lazyPage(() => import('./app/settings/SettingsLayoutVite')),
      children: [
        { index: true, element: lazyPage(() => import('./app/settings/page')) },
        { path: 'general', element: lazyPage(() => import('./app/settings/general/page')) },
        { path: 'account', element: lazyPage(() => import('./app/settings/account/page')) },
        {
          path: 'page-profile',
          element: lazyPage(() => import('./app/settings/page-profile/page')),
        },
        { path: 'addresses', element: lazyPage(() => import('./app/settings/addresses/page')) },
        { path: 'blocked', element: lazyPage(() => import('./app/settings/blocked/page')) },
        {
          path: 'blocked-users',
          element: lazyPage(() => import('./app/settings/blocked-users/page')),
        },
        {
          path: 'chat-encryption',
          element: lazyPage(() => import('./app/settings/chat-encryption/page')),
        },
        { path: 'keys', element: lazyPage(() => import('./app/settings/keys/page')) },
        { path: 'privacy', element: lazyPage(() => import('./app/settings/privacy/page')) },
        { path: 'receiving', element: lazyPage(() => import('./app/settings/receiving/page')) },
        { path: 'advanced', element: lazyPage(() => import('./app/settings/advanced/page')) },
        { path: 'moderation', element: lazyPage(() => import('./app/settings/moderation/page')) },
        {
          path: 'access-requests',
          element: lazyPage(() => import('./app/settings/access-requests/page')),
        },
        {
          path: 'product-groups',
          element: lazyPage(() => import('./app/settings/product-groups/page')),
        },
        {
          path: 'product-groups/:groupId/authorization',
          element: lazyPage(
            () => import('./app/settings/product-groups/[groupId]/authorization/page')
          ),
        },
        { path: 'user-groups', element: lazyPage(() => import('./app/settings/user-groups/page')) },
        {
          path: 'user-groups/:groupId/members',
          element: lazyPage(() => import('./app/settings/user-groups/[groupId]/members/page')),
        },
        { path: 'system', element: lazyPage(() => import('./app/settings/system/page')) },
      ],
    },

    // Admin — 卖家管理后台（使用独立布局 + AuthGuard）
    {
      path: '/admin',
      element: lazyPage(() => import('./app/admin/AdminLayoutVite')),
      children: [
        { index: true, element: lazyPage(() => import('./app/admin/page')) },
        { path: 'products', element: lazyPage(() => import('./app/admin/products/page')) },
        { path: 'orders', element: lazyPage(() => import('./app/admin/orders/page')) },
        { path: 'discounts', element: lazyPage(() => import('./app/admin/discounts/page')) },
        {
          path: 'discounts/new',
          element: lazyPage(() => import('./app/admin/discounts/new/page')),
        },
        {
          path: 'discounts/:id',
          element: lazyPage(() => import('./app/admin/discounts/[id]/page')),
        },
        {
          path: 'collections',
          element: lazyPage(() => import('./app/admin/collections/page')),
        },
        {
          path: 'collections/new',
          element: lazyPage(() => import('./app/admin/collections/new/page')),
        },
        {
          path: 'collections/:id',
          element: lazyPage(() => import('./app/admin/collections/[id]/page')),
        },
        { path: 'storefront', element: lazyPage(() => import('./app/admin/storefront/page')) },
        {
          path: 'storefronts',
          element: lazyPage(() => import('./app/admin/storefronts/page')),
        },
        {
          path: 'storefronts/new',
          element: lazyPage(() => import('./app/admin/storefronts/new/page')),
        },
        {
          path: 'storefronts/:sfID',
          element: lazyPage(() => import('./app/admin/storefronts/[sfID]/page')),
        },
        { path: 'analytics', element: lazyPage(() => import('./app/admin/analytics/page')) },
        { path: 'settings', element: lazyPage(() => import('./app/admin/settings/page')) },
        {
          path: 'settings/profile',
          element: lazyPage(() => import('./app/admin/settings/profile/page')),
        },
        {
          path: 'settings/shipping',
          element: lazyPage(() => import('./app/admin/settings/shipping/page')),
        },
        {
          path: 'settings/payments',
          element: lazyPage(() => import('./app/admin/settings/payments/page')),
        },
        {
          path: 'settings/policies',
          element: lazyPage(() => import('./app/admin/settings/policies/page')),
        },
        {
          path: 'settings/moderators',
          element: lazyPage(() => import('./app/admin/settings/moderators/page')),
        },
        {
          path: 'settings/integrations',
          element: lazyPage(() => import('./app/admin/settings/integrations/page')),
        },
        {
          path: 'settings/guest-checkout',
          element: lazyPage(() => import('./app/admin/settings/guest-checkout/page')),
        },
        {
          path: 'settings/sales-channels',
          element: lazyPage(() => import('./app/admin/settings/sales-channels/page')),
        },
        {
          path: 'settings/access-control',
          element: lazyPage(() => import('./app/admin/settings/access-control/page')),
        },
        {
          path: 'settings/access-control/privacy',
          element: lazyPage(() => import('./app/admin/settings/access-control/privacy/page')),
        },
        {
          path: 'settings/access-control/user-groups',
          element: lazyPage(() => import('./app/admin/settings/access-control/user-groups/page')),
        },
        {
          path: 'settings/access-control/product-groups',
          element: lazyPage(
            () => import('./app/admin/settings/access-control/product-groups/page')
          ),
        },
        {
          path: 'settings/access-control/product-groups/:groupId',
          element: lazyPage(
            () => import('./app/admin/settings/access-control/product-groups/[groupId]/page')
          ),
        },
        {
          path: 'settings/access-control/product-groups/:groupId/authorization',
          element: lazyPage(
            () =>
              import('./app/admin/settings/access-control/product-groups/[groupId]/authorization/page')
          ),
        },
        {
          path: 'settings/access-control/user-groups/:groupId/members',
          element: lazyPage(
            () => import('./app/admin/settings/access-control/user-groups/[groupId]/members/page')
          ),
        },
        {
          path: 'settings/access-control/requests',
          element: lazyPage(() => import('./app/admin/settings/access-control/requests/page')),
        },
        { path: 'sourcing', element: lazyPage(() => import('./app/admin/sourcing/page')) },
        {
          path: 'sourcing/catalog',
          element: lazyPage(() => import('./app/admin/sourcing/catalog/page')),
        },
        {
          path: 'sourcing/designs',
          element: lazyPage(() => import('./app/admin/sourcing/designs/page')),
        },
        {
          path: 'sourcing/products',
          element: lazyPage(() => import('./app/admin/sourcing/products/page')),
        },
        {
          path: 'sourcing/import/catalog/:providerID/:productID',
          element: lazyPage(
            () => import('./app/admin/sourcing/import/catalog/[providerID]/[productID]/page')
          ),
        },
        {
          path: 'sourcing/import/design/:providerID/:syncProductID',
          element: lazyPage(
            () => import('./app/admin/sourcing/import/design/[providerID]/[syncProductID]/page')
          ),
        },
        { path: 'system', element: lazyPage(() => import('./app/admin/system/page')) },
        { path: 'ai-agents', element: lazyPage(() => import('./app/admin/ai-agents/page')) },
      ],
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
} // end if (!__OUTPOST__)

/**
 * Outpost route subset — single-store, anonymous guest checkout,
 * no marketplace/search/wallet/chat/moderation/social features.
 */
let outpostRoutes: RouteObject[] = [];
if (__OUTPOST__) {
  outpostRoutes = [
    // Storefront (single-store home)
    { path: '/', element: lazyPage(() => import('./app/page')) },

    // Product detail
    { path: '/product/:slug', element: lazyPage(() => import('./app/product/[slug]/page')) },

    // Collections
    { path: '/collections', element: lazyPage(() => import('./app/collections/page')) },
    { path: '/collections/:id', element: lazyPage(() => import('./app/collections/[id]/page')) },

    // Cart
    { path: '/cart', element: lazyPage(() => import('./app/cart/page')) },

    // Guest Checkout (anonymous crypto payment)
    { path: '/guest-checkout', element: lazyPage(() => import('./app/guest-checkout/page')) },
    {
      path: '/guest-order/:orderToken',
      element: lazyPage(() => import('./app/guest-order/page')),
    },

    // Track Order (buyer entry point)
    { path: '/track', element: lazyPage(() => import('./app/track/page')) },

    // Policies
    {
      path: '/policies',
      element: lazyPage(() => import('./app/policies/PoliciesLayoutVite')),
      children: [
        { path: 'privacy', element: lazyPage(() => import('./app/policies/privacy/page')) },
        { path: 'terms', element: lazyPage(() => import('./app/policies/terms/page')) },
        { path: 'shipping', element: lazyPage(() => import('./app/policies/shipping/page')) },
        { path: 'returns', element: lazyPage(() => import('./app/policies/returns/page')) },
        { path: 'refund', element: lazyPage(() => import('./app/policies/refund/page')) },
      ],
    },

    // Admin — reduced to essentials
    {
      path: '/admin',
      element: lazyPage(() => import('./app/admin/AdminLayoutVite')),
      children: [
        { index: true, element: lazyPage(() => import('./app/admin/page')) },
        { path: 'products', element: lazyPage(() => import('./app/admin/products/page')) },
        { path: 'orders', element: lazyPage(() => import('./app/admin/orders/page')) },
        {
          path: 'collections',
          element: lazyPage(() => import('./app/admin/collections/page')),
        },
        {
          path: 'collections/new',
          element: lazyPage(() => import('./app/admin/collections/new/page')),
        },
        {
          path: 'collections/:id',
          element: lazyPage(() => import('./app/admin/collections/[id]/page')),
        },
        { path: 'settings', element: lazyPage(() => import('./app/admin/settings/page')) },
        {
          path: 'settings/profile',
          element: lazyPage(() => import('./app/admin/settings/profile/page')),
        },
        {
          path: 'settings/shipping',
          element: lazyPage(() => import('./app/admin/settings/shipping/page')),
        },
        {
          path: 'settings/payments',
          element: lazyPage(() => import('./app/admin/settings/payments/page')),
        },
        {
          path: 'settings/policies',
          element: lazyPage(() => import('./app/admin/settings/policies/page')),
        },
        { path: 'system', element: lazyPage(() => import('./app/admin/system/page')) },
        { path: 'ai-agents', element: lazyPage(() => import('./app/admin/ai-agents/page')) },
      ],
    },

    // Listing management
    { path: '/listing/new', element: protectedPage(() => import('./app/listing/new/page')) },
    {
      path: '/listing/edit/:slug',
      element: protectedPage(() => import('./app/listing/edit/[slug]/page')),
    },

    // Notifications (local WebSocket only)
    { path: '/notifications', element: protectedPage(() => import('./app/notifications/page')) },
  ];
} // end if (__OUTPOST__)

const activeRoutes = __OUTPOST__ ? outpostRoutes : routes;

// 导出路由配置数组（供 main.tsx 使用）
export { activeRoutes as routes };

// 也导出完整的 router（备用）
export const router = createBrowserRouter(activeRoutes);
