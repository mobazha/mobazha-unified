#!/usr/bin/env npx ts-node
/**
 * API 健康检查脚本
 * 运行: npx ts-node scripts/health-check.ts
 */

import { runFullHealthCheck, quickPing } from '../testing/healthCheck';
import { switchToTestEnv, switchToProdEnv, getEnvConfig } from '../config/env';
import { setApiConfig } from '../services/api/config';

async function main() {
  const args = process.argv.slice(2);
  const useProd = args.includes('--prod');
  const quickMode = args.includes('--quick');

  console.log('🏥 Mobazha API Health Check\n');
  console.log('='.repeat(50));

  // 设置环境
  if (useProd) {
    console.log('⚠️  Using PRODUCTION environment');
    switchToProdEnv();
  } else {
    console.log('🧪 Using TEST environment');
    switchToTestEnv();
  }

  const env = getEnvConfig();
  setApiConfig({
    gatewayUrl: env.api.gateway,
    searchUrl: env.api.search,
    mbzGatewayUrl: env.api.mbzGateway,
  });

  console.log(`\n📡 API Base: ${env.api.gateway}`);
  console.log(`🔐 Casdoor: ${env.casdoor.serverUrl}\n`);
  console.log('='.repeat(50));

  if (quickMode) {
    console.log('\n⚡ Quick Ping Mode\n');
    const isAvailable = await quickPing();

    if (isAvailable) {
      console.log('✅ API Server is AVAILABLE');
      process.exit(0);
    } else {
      console.log('❌ API Server is UNAVAILABLE');
      process.exit(1);
    }
  }

  // 完整健康检查
  console.log('\n🔍 Running Full Health Check...\n');

  try {
    const report = await runFullHealthCheck();

    console.log('\n' + '='.repeat(50));
    console.log('📊 Final Report');
    console.log('='.repeat(50));

    console.log(`\nEnvironment: ${report.environment}`);
    console.log(`Timestamp: ${report.timestamp}`);

    console.log('\n👥 Role Results:');
    for (const roleReport of report.roles) {
      const loginStatus = roleReport.loginSuccess ? '✅' : '❌';
      console.log(`  ${loginStatus} ${roleReport.role.toUpperCase()}`);

      if (roleReport.loginSuccess) {
        console.log(`     Login Time: ${roleReport.loginTime}ms`);

        const successEndpoints = roleReport.endpoints.filter(e => e.status === 'ok');
        const failedEndpoints = roleReport.endpoints.filter(e => e.status === 'error');

        console.log(
          `     Endpoints: ${successEndpoints.length}/${roleReport.endpoints.length} passed`
        );

        if (failedEndpoints.length > 0) {
          console.log(`     Failed:`);
          for (const ep of failedEndpoints) {
            console.log(`       - ${ep.name}: ${ep.error}`);
          }
        }
      }
    }

    console.log('\n📈 Summary:');
    console.log(`  Total Endpoints: ${report.summary.totalEndpoints}`);
    console.log(`  Passed: ${report.summary.successCount}`);
    console.log(`  Failed: ${report.summary.failCount}`);
    console.log(`  Success Rate: ${report.summary.successRate.toFixed(1)}%`);

    // 根据成功率决定退出码
    if (report.summary.successRate >= 80) {
      console.log('\n✅ Health Check PASSED');
      process.exit(0);
    } else if (report.summary.successRate >= 50) {
      console.log('\n⚠️  Health Check PARTIAL');
      process.exit(0);
    } else {
      console.log('\n❌ Health Check FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Health Check Error:', error);
    process.exit(1);
  }
}

main();
