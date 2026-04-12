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
export const DEFAULT_SITE_URL = 'https://app.mobazha.org';

/**
 * Store subdomain base domain (e.g. "mymbz.org" → {handle}.mymbz.org).
 * Override via NEXT_PUBLIC_STORE_SUBDOMAIN_BASE for test environments (e.g. "mobaza.org").
 */
export function getStoreSubdomainBase(): string {
  return (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE) || 'mymbz.org'
  );
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

/**
 * 测试环境配置
 *
 * API 路径说明（参考后端 gateway.go 和移动端 api/const.js）：
 * - baseUrl: 基础 URL，用于 /platform/v1/* 接口 (如 /platform/v1/auth/signin, /platform/v1/accounts/me)
 * - gateway: 节点 API URL，用于 /v1/* 接口 (如 /v1/profile, /v1/listing)
 * - search: 搜索 API URL，用于 /info/* 接口
 */
export const TEST_ENV: EnvConfig = {
  isDevelopment: true,
  isTestEnv: true,
  auth: {
    mode: 'hosted', // 测试环境默认使用托管模式
  },
  casdoor: {
    serverUrl: 'https://test-new-login.mobazha.org',
    clientId: '22649a5edc7cabcb4398',
    organizationName: 'built-in',
    appName: 'app-built-in',
    redirectPath: '/',
  },
  api: {
    baseUrl: 'https://miniappdev.mobazha.org', // 基础 URL，用于 /platform/*
    gateway: 'https://miniappdev.mobazha.org/v1', // 节点 API，用于 /v1/*
    search: 'https://miniappdev.mobazha.org/info',
    mbzGateway: 'https://miniappdev.mobazha.org/info/v1',
    websocket: 'wss://miniappdev.mobazha.org/ws',
  },
};

/**
 * 生产环境配置
 */
export const PROD_ENV: EnvConfig = {
  isDevelopment: false,
  isTestEnv: false,
  auth: {
    mode: 'hosted', // 生产环境默认使用托管模式
  },
  casdoor: {
    serverUrl: 'https://login.mobazha.org',
    clientId: 'abf0d355830c72755440',
    organizationName: 'mobazha',
    appName: 'app-mobazha',
    redirectPath: '/',
  },
  api: {
    baseUrl: 'https://miniapp.mobazha.org', // 基础 URL，用于 /platform/*
    gateway: 'https://miniapp.mobazha.org/v1', // 节点 API，用于 /v1/*
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
 * 从环境变量初始化配置
 */
export function initEnvFromProcess(): void {
  const envMode = process.env.NEXT_PUBLIC_ENV_MODE;

  switch (envMode) {
    case 'production':
      switchToProdEnv();
      break;
    case 'local':
      switchToLocalEnv();
      break;
    case 'test':
    default:
      switchToTestEnv();
      break;
  }

  // 允许通过环境变量覆盖 API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
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
  const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
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
  const casdoorUrl = process.env.NEXT_PUBLIC_CASDOOR_URL;
  const casdoorClientId = process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID;
  if (casdoorUrl || casdoorClientId) {
    currentEnv = {
      ...currentEnv,
      casdoor: {
        ...currentEnv.casdoor,
        ...(casdoorUrl && { serverUrl: casdoorUrl }),
        ...(casdoorClientId && { clientId: casdoorClientId }),
      },
    };
  }

  // 允许通过环境变量覆盖认证模式
  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE;
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
  const basicUsername = process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME;
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
  const saasUrl = process.env.NEXT_PUBLIC_SAAS_URL;
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
  const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  if (discordClientId) {
    currentEnv = {
      ...currentEnv,
      discord: { clientId: discordClientId },
    };
  }
}

// 自动初始化
// Vite 的 define 在编译时替换 process.env.NEXT_PUBLIC_* 为字面量，
// 但 process 对象本身在浏览器中不存在，所以不能用 typeof process 做守卫。
// 直接调用即可 — 函数内部所有 process.env.NEXT_PUBLIC_* 引用都会被 Vite 替换。
try {
  initEnvFromProcess();
} catch {
  // Node.js 环境中如果缺少 env var 也能安全降级
}

/**
 * Apply runtime config injected by the container init script.
 *
 * Standalone Docker containers generate /srv/www/runtime-config.js at startup,
 * which sets window.__RUNTIME_CONFIG__ with values from Docker env vars
 * (e.g. SAAS_API_URL). This allows a single generic image to be configured
 * at deploy time without rebuilding the frontend.
 *
 * Runtime values override compile-time defaults set by initEnvFromProcess().
 */
function applyRuntimeConfig(): void {
  if (typeof window === 'undefined') return;
  const rc = (window as unknown as Record<string, unknown>).__RUNTIME_CONFIG__ as
    | { saasUrl?: string; authMode?: string }
    | undefined;
  if (!rc) return;

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
}

try {
  applyRuntimeConfig();
} catch {
  // Non-browser or missing runtime config — no-op
}
