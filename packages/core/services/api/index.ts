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
