/**
 * 统一认证服务
 *
 * 支持两种认证模式：
 * - hosted: 托管模式，使用 Mobazha 中心化 Casdoor OAuth2 认证
 * - basic: VPS 模式，使用简单的用户名/密码 Basic Auth
 */

import { getAuthMode, isHostedMode, isBasicAuthMode, type AuthMode } from '../../config/env';

/**
 * 登录凭据（用于 Basic Auth 模式）
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * 登录结果
 */
export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * 认证服务接口
 */
export interface IAuthService {
  /** 获取当前认证模式 */
  getAuthMode(): AuthMode;

  /** 是否需要显示登录表单（basic 模式需要，hosted 模式不需要） */
  needsLoginForm(): boolean;

  /**
   * 发起登录
   * - hosted 模式：跳转到 Casdoor 登录页面
   * - basic 模式：不做任何事，需要调用 login() 方法
   */
  startLogin(): void;

  /**
   * 执行登录
   * - hosted 模式：处理 OAuth 回调（code, state）
   * - basic 模式：使用用户名密码登录
   */
  login(credentials?: LoginCredentials | { code: string; state: string }): Promise<AuthResult>;

  /** 检查是否有 OAuth 回调参数（仅 hosted 模式） */
  hasOAuthCallback(): boolean;

  /** 获取 OAuth 回调参数（仅 hosted 模式） */
  getOAuthParams(): { code: string | null; state: string | null };

  /** 清理 URL 中的 OAuth 参数 */
  clearOAuthParams(): void;

  /** 获取登录后应该返回的页面路径 */
  getLoginRedirectPath(): string;
}

// 延迟导入以避免循环依赖
let hostedAuthService: IAuthService | null = null;
let basicAuthService: IAuthService | null = null;

async function getHostedAuthService(): Promise<IAuthService> {
  if (!hostedAuthService) {
    const module = await import('./hostedAuth');
    hostedAuthService = module.hostedAuthService;
  }
  return hostedAuthService;
}

async function getBasicAuthService(): Promise<IAuthService> {
  if (!basicAuthService) {
    const module = await import('./basicAuth');
    basicAuthService = module.basicAuthService;
  }
  return basicAuthService;
}

/**
 * 获取当前认证服务实例（根据配置的认证模式）
 */
export async function getAuthService(): Promise<IAuthService> {
  if (isHostedMode()) {
    return getHostedAuthService();
  }
  return getBasicAuthService();
}

/**
 * 同步获取认证模式（用于 UI 判断）
 */
export function getCurrentAuthMode(): AuthMode {
  return getAuthMode();
}

/**
 * 同步判断是否需要显示登录表单
 */
export function needsLoginForm(): boolean {
  return isBasicAuthMode();
}

/**
 * 同步判断是否为托管模式
 */
export function isHosted(): boolean {
  return isHostedMode();
}

/**
 * 同步判断是否为 Basic Auth 模式
 */
export function isBasic(): boolean {
  return isBasicAuthMode();
}
