/**
 * API 健康检查工具
 * 用于验证后端 API 连接状态
 */

import { getEnvConfig } from '../config/env';
import { type TestRole } from '../config/testAccounts';
import { switchRole, logoutCurrentRole } from './roleManager';
import { getGatewayUrl } from '../services/api/config';
import { getAuthHeaders } from '../services/api/config';

export interface HealthCheckResult {
  endpoint: string;
  name: string;
  status: 'ok' | 'error';
  statusCode?: number;
  responseTime: number;
  error?: string;
}

export interface RoleHealthReport {
  role: TestRole;
  loginSuccess: boolean;
  loginTime?: number;
  endpoints: HealthCheckResult[];
}

export interface FullHealthReport {
  environment: string;
  apiBase: string;
  timestamp: string;
  roles: RoleHealthReport[];
  summary: {
    totalEndpoints: number;
    successCount: number;
    failCount: number;
    successRate: number;
  };
}

// 需要检查的端点
const ENDPOINTS = [
  { path: '/ob/profile', name: 'My Profile', auth: true },
  { path: '/ob/listingindex', name: 'Listing Index', auth: true },
  { path: '/ob/purchases', name: 'Purchases', auth: true },
  { path: '/ob/sales', name: 'Sales', auth: true },
  { path: '/wallet/balance', name: 'Wallet Balance', auth: true },
  { path: '/ob/cases', name: 'Dispute Cases', auth: true },
  { path: '/ob/notifications', name: 'Notifications', auth: true },
];

/**
 * 检查单个端点
 */
async function checkEndpoint(
  path: string,
  name: string,
  requiresAuth: boolean
): Promise<HealthCheckResult> {
  const baseUrl = getGatewayUrl();
  const url = `${baseUrl}${path}`;
  const startTime = Date.now();

  try {
    const headers = requiresAuth ? getAuthHeaders() : { 'Content-Type': 'application/json' };

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        endpoint: path,
        name,
        status: 'ok',
        statusCode: response.status,
        responseTime,
      };
    }

    return {
      endpoint: path,
      name,
      status: 'error',
      statusCode: response.status,
      responseTime,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      endpoint: path,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * 检查指定角色的 API 健康状态
 */
export async function checkRoleHealth(role: TestRole): Promise<RoleHealthReport> {
  const loginStart = Date.now();
  const profile = await switchRole(role);
  const loginTime = Date.now() - loginStart;

  const report: RoleHealthReport = {
    role,
    loginSuccess: !!profile,
    loginTime: profile ? loginTime : undefined,
    endpoints: [],
  };

  if (!profile) {
    return report;
  }

  // 检查所有端点
  for (const ep of ENDPOINTS) {
    const result = await checkEndpoint(ep.path, ep.name, ep.auth);
    report.endpoints.push(result);
  }

  return report;
}

/**
 * 执行完整的健康检查
 */
export async function runFullHealthCheck(): Promise<FullHealthReport> {
  const env = getEnvConfig();
  const roles: TestRole[] = ['buyer', 'seller', 'moderator'];
  const roleReports: RoleHealthReport[] = [];

  console.log('🏥 Starting API Health Check...\n');
  console.log(`Environment: ${env.isTestEnv ? 'Test' : 'Production'}`);
  console.log(`API Base: ${env.api.gateway}\n`);

  for (const role of roles) {
    console.log(`\n--- Checking ${role.toUpperCase()} ---`);
    const report = await checkRoleHealth(role);
    roleReports.push(report);

    if (report.loginSuccess) {
      console.log(`✅ Login: ${report.loginTime}ms`);
      for (const ep of report.endpoints) {
        const icon = ep.status === 'ok' ? '✅' : '❌';
        console.log(`${icon} ${ep.name}: ${ep.responseTime}ms ${ep.error || ''}`);
      }
    } else {
      console.log('❌ Login failed');
    }
  }

  // 计算统计
  let totalEndpoints = 0;
  let successCount = 0;

  for (const report of roleReports) {
    for (const ep of report.endpoints) {
      totalEndpoints++;
      if (ep.status === 'ok') {
        successCount++;
      }
    }
  }

  const failCount = totalEndpoints - successCount;
  const successRate = totalEndpoints > 0 ? (successCount / totalEndpoints) * 100 : 0;

  // 清理
  logoutCurrentRole();

  const fullReport: FullHealthReport = {
    environment: env.isTestEnv ? 'test' : 'production',
    apiBase: env.api.gateway,
    timestamp: new Date().toISOString(),
    roles: roleReports,
    summary: {
      totalEndpoints,
      successCount,
      failCount,
      successRate,
    },
  };

  console.log('\n--- Summary ---');
  console.log(`Total: ${totalEndpoints} | Success: ${successCount} | Failed: ${failCount}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);

  return fullReport;
}

/**
 * 快速检查 API 是否可用（无需登录）
 */
export async function quickPing(): Promise<boolean> {
  const baseUrl = getGatewayUrl();

  try {
    const response = await fetch(`${baseUrl}/api/serverInfo`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok || response.status === 401; // 401 也说明服务可用
  } catch {
    return false;
  }
}
