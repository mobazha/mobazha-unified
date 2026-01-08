// API 配置
export {
  setApiConfig,
  getApiConfig,
  getHostingUrl,
  getGatewayUrl,
  getSearchUrl,
  getMbzGatewayUrl,
  setAuthCredentials,
  clearAuthCredentials,
  setGroupContext,
  getHeadersWithContext,
  getImageUrl,
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

// 商品 API
export * as productsApi from './products';

// 订单 API
export * as ordersApi from './orders';

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

// 争议/仲裁 API
export * as disputesApi from './disputes';

// 图片上传 API
export * as imagesApi from './images';

// Matrix 聊天 API
export * as matrixApi from './matrix';
