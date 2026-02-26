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
  getHeadersWithContext,
  getImageUrl,
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
export { ApiError, request, get, post, put, del, safeRequest } from './client';

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

// 通知 API
export * as notificationsApi from './notifications';
export type {
  Notification,
  NotificationFilter,
  NotificationsResult,
  NotificationType,
} from './notifications';
export { getNotificationRoute, NOTIFICATION_FILTER_TYPES } from './notifications';

// 争议/仲裁 API
export * as disputesApi from './disputes';

// 图片上传 API
export * as imagesApi from './images';

// Matrix 聊天 API
export * as matrixApi from './matrix';

// 通知渠道 API (Telegram, Discord, etc.)
export * as notificationChannelsApi from './notificationChannels';
export type {
  ChannelConfig,
  ChannelFieldSchema,
  ChannelTypeInfo,
  ChannelTypesResponse,
  DetectedChat,
} from './notificationChannels';
