/**
 * Vite 开发环境路由配置
 * 映射 Next.js App Router 结构到 React Router
 *
 * 路由分为两类：
 * - 公开路由：无需登录即可访问
 * - 私有路由：需要登录才能访问，使用 ProtectedRoute 包装
 */
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { Suspense, type ComponentType } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { RuntimeCapabilityBoundary } from './components/RuntimeCapabilityBoundary';
import { UnifiedFrontendFeatureBoundary } from './components/UnifiedFrontendFeatureBoundary';
import {
  UNIFIED_FRONTEND_FEATURE,
  type RuntimeCapabilityKey,
  type UnifiedFrontendFeatureId,
} from '@mobazha/core';
import { commercialExtensionRoutes } from './routes.commercial';

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
  const LazyComponent = lazyWithRetry(importFn);
  return (
    <Suspense fallback={<PageLoading />}>
      <LazyComponent />
    </Suspense>
  );
}

// 懒加载包装器（私有路由，需要登录）
function protectedPage(importFn: () => Promise<{ default: ComponentType<unknown> }>) {
  const LazyComponent = lazyWithRetry(importFn);
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoading />}>
        <LazyComponent />
      </Suspense>
    </ProtectedRoute>
  );
}

function capabilityPage(
  capability: RuntimeCapabilityKey,
  importFn: () => Promise<{ default: ComponentType<unknown> }>,
  protectedRoute = false
) {
  const page = lazyPage(importFn);
  const guarded = (
    <RuntimeCapabilityBoundary capability={capability}>{page}</RuntimeCapabilityBoundary>
  );
  return protectedRoute ? <ProtectedRoute>{guarded}</ProtectedRoute> : guarded;
}

function composedFeaturePage(
  feature: UnifiedFrontendFeatureId,
  importFn: () => Promise<{ default: ComponentType<unknown> }>,
  protectedRoute = false
) {
  const page = lazyPage(importFn);
  const guarded = (
    <UnifiedFrontendFeatureBoundary feature={feature}>{page}</UnifiedFrontendFeatureBoundary>
  );
  return protectedRoute ? <ProtectedRoute>{guarded}</ProtectedRoute> : guarded;
}

// Full route table — guarded by compile-time constant so Rollup eliminates all
// dynamic imports in Sovereign builds.
let routes: RouteObject[] = [];
if (!__SOVEREIGN__) {
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
    {
      path: '/store/:peerId',
      element: capabilityPage('commerce.storefront', () => import('./app/store/[peerId]/page')),
    },
    {
      path: '/store/:peerId/collection/:collectionId',
      element: capabilityPage(
        'commerce.storefront',
        () => import('./app/store/[peerId]/collection/[collectionId]/page')
      ),
    },

    // 产品详情（公开浏览）
    {
      path: '/product/:slug',
      element: capabilityPage(
        'commerce.storefront',
        () => import('./app/product/[slug]/ProductPageClient')
      ),
    },

    // 市场列表和详情（公开浏览）
    {
      path: '/marketplace',
      element: capabilityPage('marketplace.discovery', () => import('./app/marketplace/page')),
    },
    {
      path: '/marketplace/:slug',
      element: capabilityPage(
        'marketplace.discovery',
        () => import('./app/marketplace/[slug]/page')
      ),
    },
    {
      // Seller invite-link landing — public resolve, sign-in only to accept.
      path: '/join/marketplace/:token',
      element: lazyPage(() => import('./app/join/marketplace/[token]/page')),
    },

    // 仲裁员列表（公开浏览）
    { path: '/moderators', element: lazyPage(() => import('./app/moderators/page')) },
    { path: '/moderators/:id', element: lazyPage(() => import('./app/moderators/[id]/page')) },

    // Collections（公开浏览 — standalone 独立站）
    { path: '/collections', element: lazyPage(() => import('./app/collections/page')) },
    { path: '/collections/:id', element: lazyPage(() => import('./app/collections/[id]/page')) },

    // DG-1.12: digital-goods cost calculator (public marketing page)
    {
      path: '/tools/cost-calculator',
      element: lazyPage(() => import('./app/tools/cost-calculator/page')),
    },

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

    // Help pages (public)
    {
      path: '/help',
      element: lazyPage(() => import('./app/help/HelpLayoutVite')),
      children: [
        {
          path: 'exchange-usdt-payment',
          element: lazyPage(() => import('./app/help/exchange-usdt-payment/page')),
        },
      ],
    },

    // ============================================
    // 私有路由（需要登录）
    // ============================================

    // 购物车（公开 — 数据在 localStorage，无需登录）
    { path: '/cart', element: lazyPage(() => import('./app/cart/page')) },

    // Guest Checkout（公开 — 匿名买家直接加密货币支付）
    {
      path: '/guest-checkout',
      element: composedFeaturePage(
        UNIFIED_FRONTEND_FEATURE.guestCheckout,
        () => import('./app/guest-checkout/page')
      ),
    },
    {
      path: '/guest-order/:orderToken',
      element: lazyPage(() => import('./app/guest-order/[orderToken]/page')),
    },
    {
      path: '/deal/:token',
      element: lazyPage(() => import('./app/deal/[token]/page')),
    },
    {
      path: '/promo/:sellerPeerID/:token',
      element: lazyPage(() => import('./app/promo/[sellerPeerID]/[token]/page')),
    },
    {
      path: '/promote/:sellerPeerID/:programId/commissions',
      element: lazyPage(() => import('./app/promote/[sellerPeerID]/[programId]/commissions/page')),
    },
    {
      path: '/promote/:sellerPeerID/:programId',
      element: lazyPage(() => import('./app/promote/[sellerPeerID]/[programId]/page')),
    },

    // 结账流程
    {
      path: '/checkout',
      element: capabilityPage('commerce.checkout', () => import('./app/checkout/page'), true),
    },
    {
      path: '/checkout/moderator',
      element: capabilityPage(
        'commerce.checkout',
        () => import('./app/checkout/moderator/page'),
        true
      ),
    },
    {
      path: '/checkout/payment-method',
      element: capabilityPage(
        'commerce.checkout',
        () => import('./app/checkout/payment-method/page'),
        true
      ),
    },
    {
      path: '/checkout/confirmation',
      element: capabilityPage(
        'commerce.checkout',
        () => import('./app/checkout/confirmation/page'),
        true
      ),
    },

    // 商品管理
    { path: '/listing/quick', element: protectedPage(() => import('./app/listing/quick/page')) },
    { path: '/listing/new', element: protectedPage(() => import('./app/listing/new/page')) },
    {
      path: '/listing/edit/:slug',
      element: protectedPage(() => import('./app/listing/edit/[slug]/page')),
    },
    { path: '/listing/import', element: protectedPage(() => import('./app/listing/import/page')) },

    // Marketplace 运营台与买家市场分离，避免把店铺后台和市场治理混在一起。
    {
      path: '/operator/marketplaces',
      element: composedFeaturePage(
        UNIFIED_FRONTEND_FEATURE.marketplaceOperator,
        () => import('./app/operator/marketplaces/page'),
        true
      ),
    },
    {
      path: '/operator/marketplaces/:id',
      element: composedFeaturePage(
        UNIFIED_FRONTEND_FEATURE.marketplaceOperator,
        () => import('./app/operator/marketplaces/[id]/page'),
        true
      ),
    },
    {
      path: '/operator/marketplaces/:id/preview',
      element: composedFeaturePage(
        UNIFIED_FRONTEND_FEATURE.marketplaceOperator,
        () => import('./app/operator/marketplaces/[id]/preview/page'),
        true
      ),
    },
    {
      path: '/marketplace/:slug/sell',
      element: capabilityPage(
        'marketplace.selling',
        () => import('./app/marketplace/[slug]/sell/page'),
        true
      ),
    },

    // 收藏/愿望单
    { path: '/wishlist', element: protectedPage(() => import('./app/wishlist/page')) },

    // 用户中心（Me 页自带 anonymous/buyer/owner 三态渲染，不需要 ProtectedRoute 硬门控）
    { path: '/me', element: lazyPage(() => import('./app/me/page')) },
    { path: '/profile', element: protectedPage(() => import('./app/profile/page')) },

    // 仲裁案件收件箱
    { path: '/cases', element: protectedPage(() => import('./app/cases/page')) },
    {
      path: '/cases/:orderId',
      element: protectedPage(() => import('./app/cases/[orderId]/page')),
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
    {
      path: '/orders/:orderId/discussion',
      element: protectedPage(() => import('./app/orders/[orderId]/discussion/page')),
    },

    // 支付
    { path: '/payment', element: protectedPage(() => import('./app/payment/page')) },

    // RWA 仪表盘
    { path: '/rwa-dashboard', element: protectedPage(() => import('./app/rwa-dashboard/page')) },

    // Collectibles Hub+NFT (P1 · SaaS · collectiblesHubEnabled)
    { path: '/collectibles', element: lazyPage(() => import('./app/collectibles/page')) },
    {
      path: '/collectibles/redemptions',
      element: protectedPage(() => import('./app/collectibles/redemptions/page')),
    },
    {
      path: '/collectibles/redeem/:id',
      element: protectedPage(() => import('./app/collectibles/redeem/[id]/page')),
    },
    {
      path: '/collectibles/:mint',
      element: lazyPage(() => import('./app/collectibles/[mint]/page')),
    },

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
        { path: 'refunds', element: lazyPage(() => import('./app/settings/refunds/page')) },
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
          path: 'product-groups/:groupId',
          element: lazyPage(() => import('./app/settings/product-groups/[groupId]/page')),
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
        { path: 'store', element: lazyPage(() => import('./app/settings/store/page')) },
        {
          path: 'marketplace-memberships',
          element: composedFeaturePage(
            UNIFIED_FRONTEND_FEATURE.marketplaceSellerReview,
            () => import('./app/settings/marketplace-memberships/page')
          ),
        },
      ],
    },

    // Admin — 卖家管理后台（使用独立布局 + AuthGuard）
    {
      path: '/admin',
      element: capabilityPage('commerce.storeAdmin', () => import('./app/admin/AdminLayoutVite')),
      children: [
        { index: true, element: lazyPage(() => import('./app/admin/page')) },
        { path: 'products', element: lazyPage(() => import('./app/admin/products/page')) },
        {
          // DG-1.9 — Gumroad migration wizard. Full build only; sovereignRoutes
          // intentionally omits this entry because the Sovereign Go binary doesn't
          // ship the /v1/listings/import/gumroad handler (excluded by the private distribution route policy).
          path: 'products/import-gumroad',
          element: lazyPage(() => import('./app/admin/products/import-gumroad/page')),
        },
        {
          // Agent product import — smart CSV/XLSX/ZIP ingest + workbench.
          // Full build only; Sovereign omits /v1/agent/product-import/* handlers.
          path: 'products/import',
          element: lazyPage(() => import('./app/admin/products/import/page')),
        },
        {
          path: 'products/import/:runId',
          element: lazyPage(() => import('./app/admin/products/import/[runId]/page')),
        },
        { path: 'orders', element: lazyPage(() => import('./app/admin/orders/page')) },
        { path: 'payments', element: lazyPage(() => import('./app/admin/payments/page')) },
        { path: 'discounts', element: lazyPage(() => import('./app/admin/discounts/page')) },
        { path: 'affiliate', element: lazyPage(() => import('./app/admin/affiliate/page')) },
        {
          path: 'deal-links',
          element: lazyPage(() => import('./app/admin/deal-links/DealLinksLayoutVite')),
          children: [
            { index: true, element: lazyPage(() => import('./app/admin/deal-links/page')) },
            {
              path: 'new',
              element: lazyPage(() => import('./app/admin/deal-links/new/page')),
            },
            {
              path: ':id/edit',
              element: lazyPage(() => import('./app/admin/deal-links/[id]/edit/page')),
            },
            {
              path: ':id/orders',
              element: lazyPage(() => import('./app/admin/deal-links/[id]/orders/page')),
            },
          ],
        },
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
        {
          path: 'collectibles/ops',
          element: lazyPage(() => import('./app/admin/collectibles/ops/page')),
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
          path: 'settings/preferences',
          element: lazyPage(() => import('./app/admin/settings/preferences/page')),
        },
        {
          path: 'settings/security',
          element: lazyPage(() => import('./app/admin/settings/security/page')),
        },
        {
          path: 'settings/shipping',
          element: lazyPage(() => import('./app/admin/settings/shipping/page')),
        },
        {
          path: 'settings/policies',
          element: lazyPage(() => import('./app/admin/settings/policies/page')),
        },
        {
          // DG-1.14: store operator responsibilities — surfaces the
          // platform-vs-seller compliance contract.
          path: 'settings/responsibilities',
          element: lazyPage(() => import('./app/admin/settings/responsibilities/page')),
        },
        {
          // DG-1.10: seller data-portability exports (listings/sales/customers).
          // Implements the "Your store, your data, your customers" contract.
          path: 'settings/data-export',
          element: lazyPage(() => import('./app/admin/settings/data-export/page')),
        },
        {
          path: 'settings/moderators',
          element: lazyPage(() => import('./app/admin/settings/moderators/page')),
        },
        {
          path: 'settings/moderators/find',
          element: lazyPage(() => import('./app/admin/settings/moderators/find/page')),
        },
        {
          path: 'settings/moderators/find/:id',
          element: lazyPage(() => import('./app/admin/settings/moderators/find/[id]/page')),
        },
        {
          path: 'settings/integrations',
          element: lazyPage(() => import('./app/admin/settings/integrations/page')),
        },
        {
          path: 'settings/sales-channels',
          element: lazyPage(() => import('./app/admin/settings/sales-channels/page')),
        },
        {
          path: 'settings/marketplace-memberships',
          element: composedFeaturePage(
            UNIFIED_FRONTEND_FEATURE.marketplaceSellerReview,
            () => import('./app/admin/settings/marketplace-memberships/page')
          ),
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
        {
          path: 'ai',
          element: lazyPage(() => import('./app/admin/ai/AdminAiSectionLayoutVite')),
          children: [
            {
              path: 'workspace',
              element: lazyPage(() => import('./app/admin/ai/workspace/page')),
            },
            {
              path: 'models',
              element: lazyPage(() => import('./app/admin/ai/models/page')),
            },
            {
              path: 'connect',
              element: lazyPage(() => import('./app/admin/ai/connect/page')),
            },
          ],
        },
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
} // end if (!__SOVEREIGN__)

/**
 * Sovereign route subset — single-store, anonymous guest checkout,
 * no marketplace/search/wallet/chat/moderation/social features.
 */
let sovereignRoutes: RouteObject[] = [];
let routedTmaRoutes: RouteObject[] = [];

if (__ROUTED_TMA__) {
  routedTmaRoutes = [
    { path: '/', element: lazyPage(() => import('./app/page')) },
    {
      path: '/store',
      element: capabilityPage('commerce.storefront', () => import('./app/store/page')),
    },
    {
      path: '/store/:peerId',
      element: capabilityPage('commerce.storefront', () => import('./app/store/[peerId]/page')),
    },
    {
      path: '/product/:slug',
      element: capabilityPage(
        'commerce.storefront',
        () => import('./app/product/[slug]/ProductPageClient')
      ),
    },
    { path: '/collections', element: lazyPage(() => import('./app/collections/page')) },
    {
      path: '/collections/:id',
      element: lazyPage(() => import('./app/collections/[id]/page')),
    },
    { path: '/cart', element: lazyPage(() => import('./app/cart/page')) },
    {
      path: '/guest-checkout',
      element: composedFeaturePage(
        UNIFIED_FRONTEND_FEATURE.guestCheckout,
        () => import('./app/guest-checkout/page')
      ),
    },
    {
      path: '/guest-order/:orderToken',
      element: lazyPage(() => import('./app/guest-order/[orderToken]/page')),
    },
    { path: '/track', element: lazyPage(() => import('./app/track/page')) },
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
    {
      path: '/help',
      element: lazyPage(() => import('./app/help/HelpLayoutVite')),
      children: [
        {
          path: 'exchange-usdt-payment',
          element: lazyPage(() => import('./app/help/exchange-usdt-payment/page')),
        },
      ],
    },
  ];
}

if (__SOVEREIGN__ && !__ROUTED_TMA__) {
  sovereignRoutes = [
    // Storefront (single-store home)
    { path: '/', element: lazyPage(() => import('./app/page')) },

    // Store — clean URL without peerId for single-store Sovereign
    {
      path: '/store',
      element: capabilityPage('commerce.storefront', () => import('./app/store/page')),
    },
    {
      path: '/store/:peerId',
      element: capabilityPage('commerce.storefront', () => import('./app/store/[peerId]/page')),
    },

    // Product detail
    {
      path: '/product/:slug',
      element: capabilityPage(
        'commerce.storefront',
        () => import('./app/product/[slug]/ProductPageClient')
      ),
    },

    // Collections
    { path: '/collections', element: lazyPage(() => import('./app/collections/page')) },
    { path: '/collections/:id', element: lazyPage(() => import('./app/collections/[id]/page')) },

    // Cart
    { path: '/cart', element: lazyPage(() => import('./app/cart/page')) },

    // Guest Checkout (anonymous crypto payment)
    {
      path: '/guest-checkout',
      element: composedFeaturePage(
        UNIFIED_FRONTEND_FEATURE.guestCheckout,
        () => import('./app/guest-checkout/page')
      ),
    },
    {
      path: '/guest-order/:orderToken',
      element: lazyPage(() => import('./app/guest-order/[orderToken]/page')),
    },
    {
      path: '/deal/:token',
      element: lazyPage(() => import('./app/deal/[token]/page')),
    },
    {
      path: '/promo/:sellerPeerID/:token',
      element: lazyPage(() => import('./app/promo/[sellerPeerID]/[token]/page')),
    },
    {
      path: '/promote/:sellerPeerID/:programId/commissions',
      element: lazyPage(() => import('./app/promote/[sellerPeerID]/[programId]/commissions/page')),
    },
    {
      path: '/promote/:sellerPeerID/:programId',
      element: lazyPage(() => import('./app/promote/[sellerPeerID]/[programId]/page')),
    },

    // Track Order (buyer entry point)
    { path: '/track', element: lazyPage(() => import('./app/track/page')) },

    // DG-1.12: digital-goods cost calculator (public marketing page)
    {
      path: '/tools/cost-calculator',
      element: lazyPage(() => import('./app/tools/cost-calculator/page')),
    },

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

    // Help pages
    {
      path: '/help',
      element: lazyPage(() => import('./app/help/HelpLayoutVite')),
      children: [
        {
          path: 'exchange-usdt-payment',
          element: lazyPage(() => import('./app/help/exchange-usdt-payment/page')),
        },
      ],
    },

    // Admin — reduced to essentials
    {
      path: '/admin',
      element: capabilityPage('commerce.storeAdmin', () => import('./app/admin/AdminLayoutVite')),
      children: [
        { index: true, element: lazyPage(() => import('./app/admin/page')) },
        { path: 'products', element: lazyPage(() => import('./app/admin/products/page')) },
        { path: 'orders', element: lazyPage(() => import('./app/admin/orders/page')) },
        { path: 'payments', element: lazyPage(() => import('./app/admin/payments/page')) },
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
          path: 'settings/preferences',
          element: lazyPage(() => import('./app/admin/settings/preferences/page')),
        },
        {
          path: 'settings/security',
          element: lazyPage(() => import('./app/admin/settings/security/page')),
        },
        {
          path: 'settings/shipping',
          element: lazyPage(() => import('./app/admin/settings/shipping/page')),
        },
        {
          path: 'settings/policies',
          element: lazyPage(() => import('./app/admin/settings/policies/page')),
        },
        {
          // DG-1.14: operator responsibilities — Sovereign build also
          // surfaces the responsibility card from /admin/settings.
          path: 'settings/responsibilities',
          element: lazyPage(() => import('./app/admin/settings/responsibilities/page')),
        },
        // NOTE: settings/data-export is intentionally omitted from the
        // Sovereign build — the /v1/exports/* backend handlers carry a
        // private distribution route policy because they depend on the full OrderService.
        // A guest-order-aware export is on the Sovereign roadmap.
        {
          path: 'settings/integrations',
          element: lazyPage(() => import('./app/admin/settings/integrations/page')),
        },
        { path: 'storefront', element: lazyPage(() => import('./app/admin/storefront/page')) },
        { path: 'system', element: lazyPage(() => import('./app/admin/system/page')) },
        {
          path: 'ai',
          element: lazyPage(() => import('./app/admin/ai/AdminAiSectionLayoutVite')),
          children: [
            {
              path: 'workspace',
              element: lazyPage(() => import('./app/admin/ai/workspace/page')),
            },
            {
              path: 'models',
              element: lazyPage(() => import('./app/admin/ai/models/page')),
            },
            {
              path: 'connect',
              element: lazyPage(() => import('./app/admin/ai/connect/page')),
            },
          ],
        },
        { path: 'ai-agents', element: lazyPage(() => import('./app/admin/ai-agents/page')) },
        ...(typeof __COMMERCIAL_EXTENSION__ !== 'undefined' && __COMMERCIAL_EXTENSION__
          ? commercialExtensionRoutes()
          : []),
      ],
    },

    // Listing management
    { path: '/listing/new', element: protectedPage(() => import('./app/listing/new/page')) },
    {
      path: '/listing/edit/:slug',
      element: protectedPage(() => import('./app/listing/edit/[slug]/page')),
    },

    // Personal settings (language, country, currency, theme, notifications)
    {
      path: '/settings',
      element: lazyPage(() => import('./app/settings/SettingsLayoutVite')),
      children: [
        { index: true, element: lazyPage(() => import('./app/settings/page')) },
        { path: 'general', element: lazyPage(() => import('./app/settings/general/page')) },
        { path: 'advanced', element: lazyPage(() => import('./app/settings/advanced/page')) },
        { path: 'store', element: lazyPage(() => import('./app/settings/store/page')) },
      ],
    },

    // Notifications (local WebSocket only)
    { path: '/notifications', element: protectedPage(() => import('./app/notifications/page')) },
  ];
} // end if (!__SOVEREIGN__)

const activeRoutes = __ROUTED_TMA__ ? routedTmaRoutes : __SOVEREIGN__ ? sovereignRoutes : routes;

// 导出路由配置数组（供 main.tsx 使用）
export { activeRoutes as routes };

// 也导出完整的 router（备用）
export const router = createBrowserRouter(activeRoutes);
