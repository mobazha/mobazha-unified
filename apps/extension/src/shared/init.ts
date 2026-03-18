import { setApiConfig } from '@mobazha/core/services/api/config';
import { switchToTestEnv, getEnvConfig, setEnvConfig } from '@mobazha/core/config/env';

export const WEB_APP_ORIGIN = 'https://test-new.mobazha.org';

/**
 * 扩展环境初始化。
 * 扩展不经过 Vite proxy，需要完整 URL。
 */
export function initExtension(): void {
  switchToTestEnv();

  const env = getEnvConfig();
  setEnvConfig({
    ...env,
    casdoor: {
      ...env.casdoor,
      serverUrl: 'https://test-new-login.mobazha.org',
      clientId: 'test-mobazha-client-id',
      organizationName: 'mobazha',
      appName: 'app-mobazha',
    },
  });

  setApiConfig({
    gatewayUrl: `${WEB_APP_ORIGIN}/v1`,
    searchUrl: `${WEB_APP_ORIGIN}/info`,
    mbzGatewayUrl: `${WEB_APP_ORIGIN}/info/v1`,
  });
}
