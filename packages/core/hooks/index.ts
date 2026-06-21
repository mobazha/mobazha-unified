'use client';

/**
 * Hooks 导出
 */

// 配置相关
export * from './useConfig';

// 商品相关
export * from './useProducts';
export * from './useListingForm';

// 订单相关
export * from './useOrders';
export * from './useOrderDetail';
export * from './usePaymentReadinessPoll';
export * from './useGuestDigitalDelivery';
export * from './useGuestOrderKind';
export * from './useGuestSupplyQuote';
export * from './useCheckoutSupplyQuote';

// 用户资料相关
export * from './useProfile';

// 聊天相关
export * from './useMatrix';
export * from './useMatrixChat';
export * from './useMatrixInit';
export * from './useAuthenticatedImage';

// 国际化相关
export * from './useI18n';
export * from './useExchangeUsdtGuideDismiss';

// 监控相关
export * from './useMonitoring';

// 钱包相关
export * from './useWallet';

// Solana 钱包相关
export * from './useSolanaWallet';

// TRON 钱包相关
export * from './useTronWallet';

// 托管合约相关
export * from './useEscrow';

// 支付相关
export * from './usePayment';

// 社交相关 (Follow/Unfollow)
export * from './useSocial';

// 购物车相关
export * from './useCart';
export * from './useWishlist';
export * from './usePriceUpdates';

// 通知相关
export * from './useNotifications';

// 争议/仲裁相关
export * from './useDisputes';

// 角色管理相关
export * from './useRole';

// 用户上下文（能力 + 上下文统一判断）
export * from './useUserContext';

// 货币相关
export * from './useCurrency';
export * from './useCurrencySelection';

// 认证仲裁员相关
export * from './useVerifiedModerators';
export * from './useStoreModerators';
export * from './useModeratorDirectory';
export * from './useModeratorPeerLookup';
export * from './useModeratorDetail';

// 访问控制相关
export * from './useAccessControl';
export * from './useUserGroups';
export * from './useProductGroups';
export * from './useGroupContext';
export * from './useCommunityMarketplaces';
export * from './useCommunityMarketplaceEnrichment';
export * from './useCommunityMarketplaceSell';

// RWA 资产相关
export * from './useRwaAssets';

// 订单操作相关
export * from './useOrderAction';

// 地址管理相关
export * from './useShippingAddresses';
export type { DisplayAddress, DisplayAddressUI } from './useShippingAddresses';
export { toDisplayAddressUI } from './useShippingAddresses';

export * from './useRefundReceivingAddresses';

// 配送档案管理相关（Shopify 模式）
export * from './useShippingProfiles';
export { createEmptyProfile } from './useShippingProfiles';

// Collection 相关
export * from './useCollections';

// Store Metadata (cross-store routing offline fallback)
export * from './useStoreMetadata';

// 法币支付相关
export * from './useFiatProviders';
export * from './useFiatPayment';
export * from './usePaymentMethods';

// 收款账户相关
export * from './useReceivingAccounts';

// 认证守卫相关
export * from './useAuthGuard';

// 店铺品牌化相关 (PG-201)
export * from './useStorefrontConfig';

// 渐进渲染 (M4-4)
export * from './useProgressiveList';

// 访客分析相关
export * from './useVisitorTracker';

// Mini App 角色相关
export * from './useMiniAppRole';

// Store Activity (data-driven activity badge)
export * from './useStoreActivity';

// Sales Channels (Store Links + Store Bot)
export * from './useSalesChannels';

// Standalone Store Info (local connectivity + domain)
export * from './useStandaloneStoreInfo';

// Storefront Mode (SSR-safe branded-subdomain detection)
export * from './useStorefrontMode';

// Native vertical sub-market (runtime host context)
export * from './useMarketplaceContext';

// Feature Flags (Phase MS — server-driven toggles + kill switches)
export * from './useFeatureFlags';

// React Query key factory + utils (M4-3)
export { queryKeys } from './queryKeys';
export { formatQueryError } from './queryUtils';

// 统一 Feature Flag hook
export * from './useFeature';
