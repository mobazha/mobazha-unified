import { applyRuntimeConfig, initEnvFromPublicConfig } from '@mobazha/core/config/env';
import {
  getRuntimeConfig,
  hasValidRuntimeShell,
  initializeRuntimeConfigFromWindow,
  subscribeRuntimeConfig,
} from '@mobazha/core/config/runtimeConfig';
import { reapplyCachedFeatureFlags } from '@mobazha/core/hooks/featureFlagsCache';
import { featureFlags } from '@mobazha/core/services/featureFlags';

const runtimeConfig = initializeRuntimeConfigFromWindow();

initEnvFromPublicConfig({
  envMode: process.env.NEXT_PUBLIC_ENV_MODE,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  mediaBaseUrl: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
  casdoorUrl: process.env.NEXT_PUBLIC_CASDOOR_URL,
  casdoorClientId: process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID,
  authMode: process.env.NEXT_PUBLIC_AUTH_MODE,
  basicUsername: process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME,
  saasUrl: process.env.NEXT_PUBLIC_SAAS_URL,
  discordClientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
  storeSubdomainBase: process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE,
});

if (hasValidRuntimeShell()) {
  applyRuntimeConfig(runtimeConfig);
}
featureFlags.initializeFromRuntimeConfig(runtimeConfig);

subscribeRuntimeConfig(() => {
  featureFlags.initializeFromRuntimeConfig(getRuntimeConfig());
  // Runtime-config refreshes carry the node's unauthenticated evaluation;
  // re-apply the authenticated serverInfo flags so they stay authoritative
  // regardless of which response lands last.
  reapplyCachedFeatureFlags();
});
