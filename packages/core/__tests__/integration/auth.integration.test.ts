/**
 * 认证 API 集成测试
 *
 * 支持两种认证模式：
 * - hosted: 托管模式（Casdoor OAuth2）- 需要浏览器环境，此处跳过
 * - basic: VPS 模式（Basic Auth）- 可以在测试中验证
 *
 * 注意：需要设置 RUN_INTEGRATION_TESTS=true 环境变量来运行网络相关测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TEST_ACCOUNTS } from '../../config/testAccounts';
import { validateToken, isTokenExpired } from '../../services/auth/casdoor';
import { basicAuthService } from '../../services/auth/basicAuth';
import {
  switchRole,
  getCurrentRole,
  logoutCurrentRole,
  clearRoleCache,
} from '../../testing/roleManager';
import { skipIfNoIntegration, isFetchAvailable } from './setup';

// 是否跳过需要网络的测试
const shouldSkipNetworkTests = () => skipIfNoIntegration() || !isFetchAvailable();

describe('Authentication Integration Tests', () => {
  beforeAll(() => {
    // 清理之前的状态
    clearRoleCache();
  });

  describe('Basic Auth Login (VPS Mode)', () => {
    it('should login buyer successfully', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const account = TEST_ACCOUNTS.buyer;
      const result = await basicAuthService.login({
        username: account.username,
        password: account.password,
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeTruthy();
      expect(result.error).toBeUndefined();
    });

    it('should login seller successfully', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const account = TEST_ACCOUNTS.seller;
      const result = await basicAuthService.login({
        username: account.username,
        password: account.password,
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeTruthy();
    });

    it('should login moderator successfully', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const account = TEST_ACCOUNTS.moderator;
      const result = await basicAuthService.login({
        username: account.username,
        password: account.password,
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeTruthy();
    });

    it('should fail with wrong password', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const result = await basicAuthService.login({
        username: 'buyer',
        password: 'wrong_password',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should fail with non-existent user', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const result = await basicAuthService.login({
        username: 'nonexistent_user',
        password: 'password',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error when credentials missing', async () => {
      // 这个测试不需要网络
      const result = await basicAuthService.login(
        undefined as unknown as { username: string; password: string }
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username and password required for basic auth mode');
    });
  });

  describe('Token Validation', () => {
    it('should validate a basic auth token format', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const account = TEST_ACCOUNTS.buyer;
      const loginResult = await basicAuthService.login({
        username: account.username,
        password: account.password,
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.token).toBeTruthy();

      // Basic Auth token 格式: "basic:base64(username:password)"
      expect(loginResult.token).toMatch(/^basic:/);
    });

    it('should reject an invalid token', async () => {
      // 这个测试需要网络，但 validateToken 使用 Casdoor API
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const isValid = await validateToken('invalid_token');
      expect(isValid).toBe(false);
    });

    it('should handle JWT token expiration check', () => {
      // 这个测试不需要网络 - 只是本地 JWT 解析

      // 创建一个模拟的过期 JWT
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      const expiredToken = `header.${btoa(JSON.stringify(expiredPayload))}.signature`;

      const isExpired = isTokenExpired(expiredToken);
      expect(isExpired).toBe(true);

      // 创建一个有效的 JWT
      const validPayload = {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
      const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`;

      const isValidExpired = isTokenExpired(validToken);
      expect(isValidExpired).toBe(false);
    });

    it('should return true for invalid JWT format', () => {
      // 无效的 JWT 格式应该被视为过期
      expect(isTokenExpired('not-a-jwt')).toBe(true);
      expect(isTokenExpired('')).toBe(true);
      expect(isTokenExpired('a.b')).toBe(true); // 只有两部分
    });
  });

  describe('Role Manager', () => {
    it('should switch to buyer role', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const profile = await switchRole('buyer');

      expect(profile).toBeTruthy();
      expect(getCurrentRole()).toBe('buyer');
    });

    it('should switch to seller role', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const profile = await switchRole('seller');

      expect(profile).toBeTruthy();
      expect(getCurrentRole()).toBe('seller');
    });

    it('should switch to moderator role', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      const profile = await switchRole('moderator');

      expect(profile).toBeTruthy();
      expect(getCurrentRole()).toBe('moderator');
    });

    it('should logout current role', async () => {
      if (shouldSkipNetworkTests()) {
        console.log('⏭️ Skipping: requires network');
        return;
      }

      await switchRole('buyer');
      expect(getCurrentRole()).toBe('buyer');

      logoutCurrentRole();
      expect(getCurrentRole()).toBeNull();
    });

    it('should return null when no role is set', () => {
      // 这个测试不需要网络
      clearRoleCache();
      expect(getCurrentRole()).toBeNull();
    });
  });
});
