// API 配置
export {
  setApiConfig,
  getApiConfig,
  setAuthCredentials,
  clearAuthCredentials,
  setGroupContext,
} from './config';

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
