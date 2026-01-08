/**
 * 托管模式认证服务
 *
 * 使用 Mobazha 中心化 Casdoor OAuth2 认证
 * 用户点击登录后直接跳转到 Casdoor，无需显示登录表单
 */

import type { IAuthService, AuthResult } from './authService';
import type { AuthMode } from '../../config/env';
import {
  getSigninUrl,
  handleOAuthCallback,
  hasOAuthCallback as checkOAuthCallback,
  getOAuthParams as getOAuthParamsFromUrl,
  clearOAuthParams as clearOAuthParamsFromUrl,
  getLoginRedirectPath as getCasdoorRedirectPath,
} from './casdoor';

/**
 * 托管模式认证服务实现
 */
class HostedAuthService implements IAuthService {
  getAuthMode(): AuthMode {
    return 'hosted';
  }

  /**
   * 托管模式不需要显示登录表单
   * 直接跳转到 Casdoor 进行登录
   */
  needsLoginForm(): boolean {
    return false;
  }

  /**
   * 发起登录：直接跳转到 Casdoor 登录页面
   */
  startLogin(): void {
    if (typeof window === 'undefined') {
      console.error('startLogin can only be called in browser');
      return;
    }

    // 保存当前页面路径，登录后返回
    const currentPath = window.location.pathname + window.location.search;
    // 排除 OAuth 回调参数
    const cleanPath = currentPath.replace(/[?&](code|state)=[^&]*/g, '').replace(/\?$/, '');
    sessionStorage.setItem('login_redirect', cleanPath || '/');

    console.log('🔐 Redirecting to Casdoor login...');
    const signinUrl = getSigninUrl();
    window.location.href = signinUrl;
  }

  /**
   * 执行登录：处理 OAuth 回调
   */
  async login(credentials?: { code: string; state: string }): Promise<AuthResult> {
    if (!credentials || !('code' in credentials) || !('state' in credentials)) {
      return {
        success: false,
        error: 'OAuth callback parameters required for hosted mode',
      };
    }

    const { code, state } = credentials;
    const result = await handleOAuthCallback(code, state);

    return {
      success: result.success,
      token: result.token,
      error: result.error,
    };
  }

  /**
   * 检查 URL 是否有 OAuth 回调参数
   */
  hasOAuthCallback(): boolean {
    return checkOAuthCallback();
  }

  /**
   * 获取 OAuth 回调参数
   */
  getOAuthParams(): { code: string | null; state: string | null } {
    return getOAuthParamsFromUrl();
  }

  /**
   * 清理 URL 中的 OAuth 参数
   */
  clearOAuthParams(): void {
    clearOAuthParamsFromUrl();
  }

  /**
   * 获取登录后应该返回的页面路径
   */
  getLoginRedirectPath(): string {
    return getCasdoorRedirectPath();
  }
}

/**
 * 托管模式认证服务单例
 */
export const hostedAuthService: IAuthService = new HostedAuthService();
