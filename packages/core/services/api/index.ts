// API 配置
export {
  setApiConfig,
  getApiConfig,
  getHostingUrl,
  getGatewayUrl,
  getBuyerGatewayUrl,
  getBuyerWebSocketUrl,
  getSellerWebSocketUrl,
  getMyGatewayUrl,
  getSearchUrl,
  getMbzGatewayUrl,
  setGroupContext,
  setStoreContextHeaders,
  getHeadersWithContext,
  getImageUrl,
  getMediaBaseURL,
  setStandaloneBuyerAuth,
  isStandaloneBuyerAuth,
} from './config';

// API 模式管理
export {
  setApiMode,
  getApiMode,
  setApiModeConfig,
  getApiModeConfig,
  shouldUseMock,
  shouldFallbackToMock,
  withMockFallback,
  type ApiMode,
} from './mode';

// API 客户端
export {
  ApiError,
  isStoreUnavailableError,
  request,
  get,
  post,
  put,
  del,
  safeRequest,
} from './client';

// 三层 API helpers（推荐使用，自动处理路由和认证）
export {
  authGet,
  authPost,
  authPut,
  authDel,
  authSafeGet,
  authRequest,
  publicGet,
  publicPost,
  publicSafeGet,
  searchGet,
  searchPost,
  searchSafeGet,
} from './helpers';

// Type-safe OpenAPI client (openapi-fetch)
export {
  createNodeClient,
  createHostingClient,
  createSearchClient,
  onOpenApiUnauthorized,
} from './openapi-client';

// 商品 API
export * as productsApi from './products';
export type { StoreListingsResult } from './products';

// 订单 API
export * as ordersApi from './orders';
export type { OrderInstructionsResponse } from './orders';

// 用户/店铺 API
export * as profileApi from './profile';

// 钱包 API
export * as walletApi from './wallet';

// 仲裁员 API
export * as moderatorsApi from './moderators';

// 集市 API
export * as marketplaceApi from './marketplace';

// 权限控制 API
export * as accessApi from './access';

// 社交 API (Follow/Unfollow)
export * as socialApi from './social';

// 购物车 API
export * as cartApi from './cart';

// 收藏/愿望单 API
export * as wishlistApi from './wishlist';
export type { WishlistItem, AddWishlistParams } from './wishlist';

// 折扣 API
export * as discountsApi from './discounts';
export type {
  Discount,
  DiscountCode,
  DiscountRedemption,
  ValidateDiscountResponse,
  ApplicableDiscount,
} from './discounts';

// Collection API
export * as collectionsApi from './collections';
export type {
  Collection,
  CollectionProduct,
  CollectionListResponse,
  CollectionType,
  CollectionSortOrder,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from './collections';

// 通知 API
export * as notificationsApi from './notifications';
export type { Notification, NotificationFilter, NotificationsResult } from './notifications';
export { getNotificationRoute, NOTIFICATION_FILTER_TYPES } from './notifications';

// 争议/仲裁 API
export * as disputesApi from './disputes';

// 图片上传 API
export * as imagesApi from './images';

// Matrix 聊天 API
export * as matrixApi from './matrix';

// 通知渠道 API (Telegram, Discord, etc.)
export * as notificationChannelsApi from './notificationChannels';

// 法币支付 API
export * as fiatApi from './fiat';

// Storefront Config API (PG-201)
export * as storefrontApi from './storefront';

// Store Metadata API (cross-store routing offline fallback)
export * as storeMetadataApi from './storeMetadata';
export type { StoreMetadataType, StoreMetadataEntry, StoreMetadataResponse } from './storeMetadata';

// Standalone Stores API
export * as standaloneStoresApi from './standaloneStores';
export type { StandaloneStore } from './standaloneStores';

// Webhooks API
export * as webhooksApi from './webhooks';
export type { WebhookEndpoint, WebhookDelivery, WebhookDeliveriesResponse } from './webhooks';

// System API (standalone setup)
export * as systemApi from './system';
export type { SetupStatusResponse, SetupCompletedSteps, InitialSetupResponse } from './system';

// Sales Channels API (Store Links + Store Bot)
export { resolveStoreShortCode } from './salesChannels';

// AI Settings API
export * as aiSettingsApi from './aiSettings';
export type {
  AIConfig,
  AIConfigInput,
  AIProviderInfo,
  AIProviderState,
  AIStatus,
  AITestConnectionResult,
} from './aiSettings';
export type {
  ChannelConfig,
  ChannelFieldSchema,
  ChannelTypeInfo,
  ChannelTypesResponse,
  DetectedChat,
} from './notificationChannels';
