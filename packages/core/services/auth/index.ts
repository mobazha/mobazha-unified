/**
 * 认证服务导出
 *
 * 支持两种认证模式：
 * - hosted: 托管模式，使用 Mobazha 中心化 Casdoor OAuth2 认证
 * - basic: VPS 模式，使用简单的用户名/密码 Basic Auth
 */

// ============ 统一认证服务（推荐使用） ============

export {
  // 认证服务
  getAuthService,
  getCurrentAuthMode,
  needsLoginForm,
  isHosted,
  isBasic,
  // 类型
  type IAuthService,
  type LoginCredentials,
  type AuthResult,
} from './authService';

// 具体实现（通常不需要直接使用）
export { hostedAuthService } from './hostedAuth';
export { basicAuthService } from './basicAuth';

// ============ Casdoor OAuth2 认证（托管模式底层） ============

export {
  // OAuth2 授权码流程
  getSigninUrl,
  getSignupUrl,
  startCasdoorLogin,
  handleOAuthCallback,
  hasOAuthCallback,
  getOAuthParams,
  clearOAuthParams,
  getLoginRedirectPath,
  // Token 验证
  validateToken,
  getUserInfo,
  parseJwtToken,
  isTokenExpired,
  // 用户 ID 相关
  getStoredUserId,
  getTelegramUserId,
  isTelegramUser,
  getCasdoorUserId,
  // 类型
  type CasdoorUser,
  type CasdoorTokenResponse,
  type CasdoorClaims,
  type LoginResult,
} from './casdoor';

// ============ Token 管理 ============

export {
  getStoredToken,
  saveToken,
  clearToken,
  getStoredUser,
  saveUser,
  clearUser,
  clearAuth,
  isAuthenticated,
  getAuthHeaders,
  type StoredUser,
} from './token';
