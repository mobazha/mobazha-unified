import { getRuntimeConfig, type RuntimeConfig } from './runtimeConfig';

/**
 * 环境配置
 * 支持测试环境和生产环境切换
 * 支持双模式认证：托管模式(hosted) 和 VPS模式(basic)
 */

/**
 * 认证模式
 * - hosted: 托管模式，使用 Mobazha 中心化 Casdoor 认证
 * - basic: VPS 模式，使用简单的用户名/密码 Basic Auth
 */
/**
 * SaaS 前端默认域名 — 当 NEXT_PUBLIC_SITE_URL 未设置时的终极回退值。
 * 域名迁移（如 app.mobazha.org → app.mobazha.org）只需改这一处。
 */
export const DEFAULT_SITE_URL: string =
  typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__ ? '' : 'https://app.mobazha.org';

/**
 * Store subdomain base domain (e.g. "mymbz.org" → {handle}.mymbz.org).
 */
const DEFAULT_STORE_SUBDOMAIN_BASE = 'mymbz.org';
let storeSubdomainBase = DEFAULT_STORE_SUBDOMAIN_BASE;

export function getStoreSubdomainBase(): string {
  return storeSubdomainBase;
}

export type AuthMode = 'hosted' | 'basic' | 'standalone';

/**
 * 认证配置
 */
export interface AuthConfig {
  /** 认证模式 */
  mode: AuthMode;
  /** Basic Auth 配置（仅 basic 模式使用） */
  basic?: {
    /** 可选预设用户名 */
    username?: string;
  };
  /** Standalone 模式配置（独立站买家认证） */
  standalone?: {
    /** SaaS 平台 URL（用于 popup OAuth 登录） */
    saasUrl: string;
  };
}

export interface CasdoorConfig {
  serverUrl: string;
  clientId: string;
  clientSecret?: string;
  organizationName: string;
  appName: string;
  redirectPath: string;
}

export interface ApiEndpoints {
  /** 基础 URL，用于 /platform/v1/* 接口 (如 /platform/v1/auth/signin) */
  baseUrl: string;
  /** 节点 API URL，用于 /v1/* 接口 (如 /v1/profile) */
  gateway: string;
  /** 搜索 API URL */
  search: string;
  /** MBZ Gateway URL */
  mbzGateway: string;
  /** WebSocket URL */
  websocket: string;
  /** CDN 媒体基础 URL（如 https://media.mobazha.org），未配置时走 gateway 降级 */
  mediaBaseUrl?: string;
}

export interface DiscordConfig {
  clientId: string;
}

export interface EnvConfig {
  isDevelopment: boolean;
  isTestEnv: boolean;
  /** 认证配置 */
  auth: AuthConfig;
  /** Casdoor 配置（仅 hosted 模式使用） */
  casdoor: CasdoorConfig;
  api: ApiEndpoints;
  /** Discord Activity / Mini App 配置 */
  discord?: DiscordConfig;
}

export interface PublicEnvConfig {
  envMode?: string;
  apiUrl?: string;
  apiBaseUrl?: string;
  mediaBaseUrl?: string;
  casdoorUrl?: string;
  casdoorClientId?: string;
  authMode?: string;
  basicUsername?: string;
  saasUrl?: string;
  discordClientId?: string;
  storeSubdomainBase?: string;
}

/**
 * 测试环境配置
 *
 * API 路径说明（参考后端 gateway.go 和移动端 api/const.js）：
 * - baseUrl: 基础 URL，用于 /platform/v1/* 接口 (如 /platform/v1/auth/signin, /platform/v1/accounts/me)
 * - gateway: 节点 API URL，用于 /v1/* 接口 (如 /v1/profile, /v1/listing)
 * - search: 搜索 API URL，用于 /info/* 接口
 */
export const TEST_ENV: EnvConfig =
  typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__
    ? ({
        isDevelopment: true,
        isTestEnv: true,
        auth: { mode: 'standalone' },
        casdoor: {
          serverUrl: '',
          clientId: '',
          organizationName: '',
          appName: '',
          redirectPath: '/',
        },
        api: { baseUrl: '', gateway: '/v1', search: '', mbzGateway: '', websocket: '' },
      } as EnvConfig)
    : {
        isDevelopment: true,
        isTestEnv: true,
        auth: {
          mode: 'hosted',
        },
        casdoor: {
          serverUrl: 'https://test-new-login.mobazha.org',
          clientId: '22649a5edc7cabcb4398',
          organizationName: 'built-in',
          appName: 'app-built-in',
          redirectPath: '/',
        },
        api: {
          baseUrl: 'https://miniappdev.mobazha.org',
          gateway: 'https://miniappdev.mobazha.org/v1',
          search: 'https://miniappdev.mobazha.org/info',
          mbzGateway: 'https://miniappdev.mobazha.org/info/v1',
          websocket: 'wss://miniappdev.mobazha.org/ws',
        },
      };

/**
 * 生产环境配置
 */
export const PROD_ENV: EnvConfig =
  typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__
    ? ({
        isDevelopment: false,
        isTestEnv: false,
        auth: { mode: 'standalone' },
        casdoor: {
          serverUrl: '',
          clientId: '',
          organizationName: '',
          appName: '',
          redirectPath: '/',
        },
        api: { baseUrl: '', gateway: '/v1', search: '', mbzGateway: '', websocket: '' },
      } as EnvConfig)
    : {
        isDevelopment: false,
        isTestEnv: false,
        auth: {
          mode: 'hosted',
        },
        casdoor: {
          serverUrl: 'https://login.mobazha.org',
          clientId: 'abf0d355830c72755440',
          organizationName: 'mobazha',
          appName: 'app-mobazha',
          redirectPath: '/',
        },
        api: {
          baseUrl: 'https://miniapp.mobazha.org',
          gateway: 'https://miniapp.mobazha.org/v1',
          search: 'https://miniapp.mobazha.org/info',
          mbzGateway: 'https://miniapp.mobazha.org/info/v1',
          websocket: 'wss://miniapp.mobazha.org/ws',
        },
      };

/**
 * 本地/VPS 开发环境配置
 */
export const LOCAL_ENV: EnvConfig = {
  isDevelopment: true,
  isTestEnv: true,
  auth: {
    mode: 'basic', // 本地/VPS 环境默认使用 Basic Auth
    basic: {
      username: 'admin', // 可选预设用户名
    },
  },
  casdoor: {
    ...TEST_ENV.casdoor,
  },
  api: {
    baseUrl: 'http://localhost:4002', // 基础 URL，用于 /platform/*
    gateway: 'http://localhost:4002/v1', // 节点 API，用于 /v1/*
    search: 'https://info.mobazha.org', // 本地开发时使用公共 info 服务
    mbzGateway: 'https://info.mobazha.org/v1',
    websocket: 'ws://localhost:4002/ws',
  },
};

/**
 * Standalone (native binary / VPS) — API on the same origin,
 * URLs are overridden at runtime by /runtime-config.js.
 */
export const STANDALONE_ENV: EnvConfig = {
  isDevelopment: false,
  isTestEnv: false,
  auth: {
    mode: 'standalone',
  },
  casdoor: {
    ...PROD_ENV.casdoor,
  },
  api: {
    baseUrl: '',
    gateway: '/v1',
    search: '',
    mbzGateway: '',
    websocket: '',
  },
};

/**
 * White-label network UI gating, mirrors `repo.NetworkFields` /
 * `frontend.NetworkSnapshot` from the backend. All flags default to
 * `false` (locked-down baseline) when omitted — partners must opt in
 * explicitly. Product-specific network policy is supplied by the private distribution.
 */
export interface BrandNetworkConfig {
  /** Show a "paste your own monerod RPC" form on the NodePool admin page. */
  allowUserCustomNode?: boolean;
  /** Show latency / fail-streak / source columns and other power-user diagnostics. */
  showAdvancedDiagnostics?: boolean;
  /** Expose Settings → Monero Nodes (and the dashboard pool banner). */
  showNodePoolUI?: boolean;
  /** Let the user toggle Tier-3 P2P discovery. */
  allowDiscoverToggle?: boolean;
}

/** White-label brand overrides from brand.yaml via /runtime-config.js. */
export interface BrandConfig {
  name: string;
  shortName?: string;
  tagline?: string;
  description?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  privacyNotice?: string;
  hidePoweredBy?: boolean;
  network?: BrandNetworkConfig;
}

let runtimeBrandConfig: BrandConfig | undefined;

/** Returns the brand config if present, or undefined for Mobazha defaults. */
export function getBrandConfig(): BrandConfig | undefined {
  return runtimeBrandConfig;
}

/**
 * Returns the brand network UI gating flags. Always returns an object so
 * callers can read fields without null-checking; missing values default to
 * `false` (the locked-down baseline). Mobazha defaults (no brand.yaml)
 * therefore hide all network/node-pool surface area.
 */
export function getBrandNetworkConfig(): Required<BrandNetworkConfig> {
  const network = runtimeBrandConfig?.network;
  return {
    allowUserCustomNode: network?.allowUserCustomNode === true,
    showAdvancedDiagnostics: network?.showAdvancedDiagnostics === true,
    showNodePoolUI: network?.showNodePoolUI === true,
    allowDiscoverToggle: network?.allowDiscoverToggle === true,
  };
}

export function isSovereignMode(): boolean {
  if (getRuntimeConfig().deployment.mode === 'sovereign') return true;
  if (typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) return true;
  return false;
}

/**
 * Returns true when external resource loading (Google Fonts, third-party CDNs)
 * should be suppressed. True for all sovereign builds and whenever the runtime
 * deployment denies external resources.
 */
export function isExternalResourcesDisabled(): boolean {
  if (!getRuntimeConfig().deployment.allowExternalResources) return true;
  if (typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) return true;
  return false;
}

// 当前环境配置
let currentEnv: EnvConfig = TEST_ENV;

/**
 * 获取当前环境配置
 */
export function getEnvConfig(): EnvConfig {
  return currentEnv;
}

/**
 * 设置环境配置
 */
export function setEnvConfig(env: EnvConfig): void {
  currentEnv = env;
}

/**
 * 切换到测试环境
 */
export function switchToTestEnv(): void {
  currentEnv = TEST_ENV;
}

/**
 * 切换到生产环境
 */
export function switchToProdEnv(): void {
  currentEnv = PROD_ENV;
}

/**
 * 切换到本地开发环境
 */
export function switchToLocalEnv(): void {
  currentEnv = LOCAL_ENV;
}

/**
 * 获取当前认证模式
 */
export function getAuthMode(): AuthMode {
  return currentEnv.auth.mode;
}

/**
 * 设置认证模式
 */
export function setAuthMode(mode: AuthMode): void {
  currentEnv = {
    ...currentEnv,
    auth: {
      ...currentEnv.auth,
      mode,
    },
  };
}

/**
 * 判断是否为托管模式
 */
export function isHostedMode(): boolean {
  return currentEnv.auth.mode === 'hosted';
}

/**
 * 判断是否为 Basic Auth 模式
 */
export function isBasicAuthMode(): boolean {
  return currentEnv.auth.mode === 'basic';
}

/**
 * 判断是否为独立站模式（买家 popup OAuth）
 */
export function isStandaloneMode(): boolean {
  return currentEnv.auth.mode === 'standalone';
}

/**
 * 从应用层传入的 public 配置初始化环境。
 *
 * Core 不直接读取 bundler 环境变量；Next/Vite 入口负责静态读取
 * NEXT_PUBLIC_* 后调用此函数，避免动态 key 访问导致 Next.js 无法内联。
 */
export function initEnvFromPublicConfig(publicEnv: PublicEnvConfig = {}): void {
  switch (publicEnv.envMode) {
    case 'production':
      switchToProdEnv();
      break;
    case 'standalone':
      currentEnv = STANDALONE_ENV;
      break;
    case 'local':
      switchToLocalEnv();
      break;
    case 'test':
    default:
      switchToTestEnv();
      break;
  }

  storeSubdomainBase = publicEnv.storeSubdomainBase || DEFAULT_STORE_SUBDOMAIN_BASE;

  // 允许通过环境变量覆盖 API URL
  const apiUrl = publicEnv.apiUrl || publicEnv.apiBaseUrl;
  if (apiUrl) {
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');
    currentEnv = {
      ...currentEnv,
      api: {
        ...currentEnv.api,
        baseUrl: apiUrl,
        gateway: `${apiUrl}/v1`,
        websocket: `${wsProtocol}://${wsHost}/ws`,
      },
    };
  }

  // CDN 媒体基础 URL（R2 公网 URL，配置后前端直达 CDN 绕过 gateway）
  const mediaBaseUrl = publicEnv.mediaBaseUrl;
  if (mediaBaseUrl) {
    currentEnv = {
      ...currentEnv,
      api: {
        ...currentEnv.api,
        mediaBaseUrl,
      },
    };
  }

  // 允许通过环境变量覆盖 Casdoor 配置（本地开发使用）
  const casdoorUrl = publicEnv.casdoorUrl;
  const casdoorClientId = publicEnv.casdoorClientId;
  if (casdoorUrl || casdoorClientId) {
    currentEnv = {
      ...currentEnv,
      casdoor: {
        ...currentEnv.casdoor,
        ...(casdoorUrl && { serverUrl: casdoorUrl }),
        ...(casdoorClientId && { clientId: casdoorClientId }),
        // Local e2e Docker: client id maps to app-mobazha / mobazha org (not TEST_ENV defaults).
        ...(casdoorClientId === 'e2e-mobazha-client-id' && {
          appName: 'app-mobazha',
          organizationName: 'mobazha',
        }),
      },
    };
  }

  // 允许通过环境变量覆盖认证模式
  const authMode = publicEnv.authMode;
  if (authMode === 'hosted' || authMode === 'basic' || authMode === 'standalone') {
    currentEnv = {
      ...currentEnv,
      auth: {
        ...currentEnv.auth,
        mode: authMode,
      },
    };
  }

  // 允许通过环境变量设置 Basic Auth 用户名
  const basicUsername = publicEnv.basicUsername;
  if (basicUsername) {
    currentEnv = {
      ...currentEnv,
      auth: {
        ...currentEnv.auth,
        basic: {
          ...currentEnv.auth.basic,
          username: basicUsername,
        },
      },
    };
  }

  // Standalone 模式: SaaS URL 配置
  const saasUrl = publicEnv.saasUrl;
  if (saasUrl) {
    currentEnv = {
      ...currentEnv,
      auth: {
        ...currentEnv.auth,
        standalone: {
          saasUrl,
        },
      },
    };
  }

  // Discord Activity / Mini App 配置
  const discordClientId = publicEnv.discordClientId;
  if (discordClientId) {
    currentEnv = {
      ...currentEnv,
      discord: { clientId: discordClientId },
    };
  }
}

/**
 * Node.js 脚本/测试兼容入口。Web 应用不要依赖这个函数，避免把 bundler
 * env 读取规则重新扩散回 core。
 */
export function initEnvFromProcess(): void {
  if (typeof process === 'undefined') {
    initEnvFromPublicConfig();
    return;
  }

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
}

/**
 * Apply runtime config published by the backend bootstrap route.
 *
 * Standalone deployments route /runtime-config.js to the node, which sets
 * window.__RUNTIME_CONFIG__ from the live environment and capability snapshot.
 * This keeps a single generic frontend image configurable without rebuilding.
 *
 * Runtime values override compile-time defaults set by initEnvFromPublicConfig().
 */
export function applyRuntimeConfig(runtimeConfig: RuntimeConfig = getRuntimeConfig()): void {
  if (typeof window === 'undefined') return;
  // Feature flags are consumed by services/featureFlags.ts. Deployment,
  // experience, and capabilities remain in the central RuntimeConfig store.
  const rc = runtimeConfig;

  if (rc.authMode === 'standalone' || rc.authMode === 'basic' || rc.authMode === 'hosted') {
    currentEnv = {
      ...currentEnv,
      auth: {
        ...currentEnv.auth,
        mode: rc.authMode,
      },
    };

    // Native binary: API served from the same origin as the SPA.
    if (typeof window !== 'undefined' && rc.authMode !== 'hosted') {
      const origin = window.location.origin;
      const wsProtocol = origin.startsWith('https') ? 'wss' : 'ws';
      const wsHost = origin.replace(/^https?:\/\//, '');
      currentEnv = {
        ...currentEnv,
        api: {
          ...currentEnv.api,
          baseUrl: origin,
          gateway: `${origin}/v1`,
          websocket: `${wsProtocol}://${wsHost}/ws`,
        },
      };
    }
  }

  if (rc.saasUrl) {
    currentEnv = {
      ...currentEnv,
      auth: {
        ...currentEnv.auth,
        standalone: {
          saasUrl: rc.saasUrl,
        },
      },
    };
  }

  runtimeBrandConfig = rc.brand?.name ? (rc.brand as unknown as BrandConfig) : undefined;

  // Apply brand overrides to the document
  if (runtimeBrandConfig) {
    const b = runtimeBrandConfig;
    if (b.name) {
      document.title = b.name;
    }
    if (b.faviconUrl) {
      const existing = document.querySelector('link[rel="icon"]');
      const link = (existing || document.createElement('link')) as HTMLLinkElement; // eslint-disable-line no-undef
      link.rel = 'icon';
      link.href = b.faviconUrl;
      if (!link.parentElement) document.head.appendChild(link);
    }
    // Brand colors are applied by useTheme → applyThemeToDOM → brandColorOverrides()
    // which overlays --color-primary/Light/Dark/accent after the base theme is set.
  }
}
