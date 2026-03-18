import { setApiConfig } from '@mobazha/core/services/api/config';
import { switchToTestEnv } from '@mobazha/core/config/env';

export const WEB_APP_ORIGIN = 'https://test-new.mobazha.org';

/**
 * 扩展环境初始化。
 * 扩展不经过 Vite proxy，需要完整 URL。
 */
export function initExtension(): void {
  switchToTestEnv();

  setApiConfig({
    gatewayUrl: `${WEB_APP_ORIGIN}/v1`,
    searchUrl: `${WEB_APP_ORIGIN}/info`,
    mbzGatewayUrl: `${WEB_APP_ORIGIN}/info/v1`,
  });
}
