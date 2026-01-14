/**
 * API 健康检查测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runFullHealthCheck, quickPing } from '../../testing/healthCheck';
import { switchToTestEnv, getEnvConfig } from '../../config/env';
import { setApiConfig } from '../../services/api/config';
import { skipIfNoIntegration } from './setup';

describe('API Health Check', () => {
  beforeAll(() => {
    if (skipIfNoIntegration()) return;

    // 确保使用测试环境
    switchToTestEnv();
    const env = getEnvConfig();
    setApiConfig({
      gatewayUrl: env.api.gateway,
      searchUrl: env.api.search,
      mbzGatewayUrl: env.api.mbzGateway,
    });
  });

  it('should quick ping the API server', async () => {
    const isAvailable = await quickPing();

    console.log(`API Server: ${isAvailable ? '✅ Available' : '❌ Unavailable'}`);

    // 不强制要求 API 可用，只是检查
    expect(typeof isAvailable).toBe('boolean');
  });

  it('should run full health check', async () => {
    const report = await runFullHealthCheck();

    expect(report).toBeTruthy();
    expect(report.environment).toBe('test');
    expect(report.roles).toBeDefined();
    expect(report.summary).toBeDefined();

    // 输出详细报告
    console.log('\n📊 Health Check Report');
    console.log(`Environment: ${report.environment}`);
    console.log(`API Base: ${report.apiBase}`);
    console.log(`Time: ${report.timestamp}`);

    console.log('\n📈 Summary:');
    console.log(`  Total Endpoints: ${report.summary.totalEndpoints}`);
    console.log(`  Success: ${report.summary.successCount}`);
    console.log(`  Failed: ${report.summary.failCount}`);
    console.log(`  Success Rate: ${report.summary.successRate.toFixed(1)}%`);
  }, 60000); // 60秒超时
});
