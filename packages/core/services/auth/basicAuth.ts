/**
 * VPS Basic Auth 模式认证服务
 *
 * 使用简单的用户名/密码 Basic Auth 认证
 * 适用于用户自己部署的 VPS 环境
 */

import type { IAuthService, AuthResult, LoginCredentials } from './authService';
import type { AuthMode } from '../../config/env';
import { getEnvConfig } from '../../config/env';
import { getGatewayUrl } from '../api/config';

/**
 * Basic Auth 模式认证服务实现
 */
class BasicAuthService implements IAuthService {
  getAuthMode(): AuthMode {
    return 'basic';
  }

  /**
   * Basic Auth 模式需要显示登录表单
   */
  needsLoginForm(): boolean {
    return true;
  }

  /**
   * Basic Auth 模式不需要发起外部登录
   * startLogin 只是一个空操作
   */
  startLogin(): void {
    // Basic Auth 模式不需要跳转，由 UI 显示登录表单
    console.log('📝 Basic Auth mode: Please enter credentials');
  }

  /**
   * 执行 Basic Auth 登录
   */
  async login(credentials?: LoginCredentials): Promise<AuthResult> {
    if (!credentials || !('username' in credentials) || !('password' in credentials)) {
      return {
        success: false,
        error: 'Username and password required for basic auth mode',
      };
    }

    const { username, password } = credentials;

    try {
      // 检查 fetch 是否可用
      if (typeof fetch === 'undefined') {
        return {
          success: false,
          error: 'fetch is not available in this environment',
        };
      }

      // 使用 Basic Auth 验证登录
      const gatewayUrl = getGatewayUrl();
      const authHeader = btoa(`${username}:${password}`);

      // 尝试获取用户资料来验证凭据
      const response = await fetch(`${gatewayUrl}/ob/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
      });

      // 检查 response 是否有效
      if (!response) {
        return {
          success: false,
          error: 'No response from server',
        };
      }

      if (response.ok) {
        console.log('✅ Basic Auth login successful');

        // Basic Auth 模式使用 Base64 编码的凭据作为 "token"
        // 这样可以在后续请求中复用
        const token = `basic:${authHeader}`;

        return {
          success: true,
          token,
        };
      }

      // 处理错误响应
      let errorMessage = 'Authentication failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // 如果响应不是 JSON，使用状态码作为错误消息
        errorMessage = `Authentication failed (${response.status})`;
      }

      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      console.error('Basic Auth login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Basic Auth 模式没有 OAuth 回调
   */
  hasOAuthCallback(): boolean {
    return false;
  }

  /**
   * Basic Auth 模式没有 OAuth 参数
   */
  getOAuthParams(): { code: string | null; state: string | null } {
    return { code: null, state: null };
  }

  /**
   * Basic Auth 模式不需要清理 OAuth 参数
   */
  clearOAuthParams(): void {
    // No-op for basic auth
  }

  /**
   * 获取登录后应该返回的页面路径
   */
  getLoginRedirectPath(): string {
    if (typeof sessionStorage === 'undefined') return '/';
    const path = sessionStorage.getItem('login_redirect');
    sessionStorage.removeItem('login_redirect');
    return path || '/';
  }

  /**
   * 获取预设的用户名（如果有配置）
   */
  getPresetUsername(): string | undefined {
    const env = getEnvConfig();
    return env.auth.basic?.username;
  }
}

/**
 * Basic Auth 模式认证服务单例
 */
export const basicAuthService: IAuthService & { getPresetUsername(): string | undefined } =
  new BasicAuthService();
