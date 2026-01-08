/**
 * 集成测试环境配置
 *
 * 集成测试需要：
 * 1. 网络访问（连接真实 API）
 * 2. 有效的测试账户
 *
 * 设置环境变量 RUN_INTEGRATION_TESTS=true 来启用集成测试
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setApiConfig } from '../../services/api/config';
import { useTestEnv, getEnvConfig } from '../../config/env';
import { clearRoleCache } from '../../testing/roleManager';

// 设置超时时间（API 调用可能较慢）
vi.setConfig({ testTimeout: 30000 });

// 检查是否应该运行集成测试
export function isIntegrationTestEnabled(): boolean {
  // 默认不运行集成测试（需要网络和真实 API）
  // 设置 RUN_INTEGRATION_TESTS=true 来启用
  return process.env.RUN_INTEGRATION_TESTS === 'true';
}

// 跳过集成测试的辅助函数
export function skipIfNoIntegration(): boolean {
  if (!isIntegrationTestEnabled()) {
    return true;
  }
  return false;
}

// 检查 fetch 是否可用
export function isFetchAvailable(): boolean {
  return typeof fetch !== 'undefined' && typeof fetch === 'function';
}

beforeAll(() => {
  // 使用测试环境配置
  useTestEnv();

  const env = getEnvConfig();

  // 配置 API
  setApiConfig({
    gatewayUrl: env.api.gateway,
    searchUrl: env.api.search,
    mbzGatewayUrl: env.api.mbzGateway,
  });

  console.log('\n🚀 Integration Test Environment');
  console.log(`   API: ${env.api.gateway}`);
  console.log(`   Casdoor: ${env.casdoor.serverUrl}`);
  console.log(`   Integration Tests: ${isIntegrationTestEnabled() ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   Fetch Available: ${isFetchAvailable() ? 'YES' : 'NO'}\n`);
});

afterEach(() => {
  // 每个测试后清理
  vi.clearAllMocks();
});

afterAll(() => {
  // 测试完成后清理所有角色缓存
  clearRoleCache();
});
