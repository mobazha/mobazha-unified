/**
 * 账号绑定相关类型定义
 */

/**
 * 支持的 OAuth Provider 类型
 */
export type OAuthProvider = 'discord' | 'telegram' | 'google' | 'github' | 'apple' | 'wechat';

/**
 * OAuthProvider → Casdoor provider name 映射
 * Casdoor 的 provider_hint 和 state 解析都使用 provider.name（数据库中的 name 字段），
 * 而非 provider type。名称不一致会导致回调时 "提供商不存在" 错误。
 */
export const CASDOOR_PROVIDER_NAMES: Record<OAuthProvider, string> = {
  discord: 'provider_discord',
  telegram: 'provider_telegram',
  google: 'provider_casdoor_google',
  github: 'provider_casdoor_github',
  apple: 'casdoor_provider_apple',
  wechat: 'provider_casdoor_wechat',
};

/**
 * 已绑定的账号信息
 */
export interface LinkedAccount {
  /** Provider 类型 */
  provider: OAuthProvider;
  /** 在该 provider 中的用户 ID */
  providerId: string;
  /** 显示名称（如果有） */
  displayName?: string;
  /** 头像 URL（如果有） */
  avatar?: string;
  /** 是否可以解绑（必须保留至少一种登录方式） */
  canUnlink: boolean;
}

/**
 * 已绑定账号列表响应
 */
export interface LinkedAccountsResponse {
  /** 已绑定的账号列表 */
  accounts: LinkedAccount[];
  /** 已绑定账号总数 */
  totalCount: number;
  /** 最少需要保留的登录方式数量 */
  minRequired: number;
}

/**
 * 绑定账号 URL 响应
 */
export interface LinkUrlResponse {
  /** OAuth 授权 URL */
  url: string;
}

/**
 * 解绑请求
 */
export interface UnlinkRequest {
  /** 要解绑的 provider 类型 */
  provider: OAuthProvider;
}

/**
 * 解绑响应
 */
export interface UnlinkResponse {
  success: boolean;
  message: string;
}

/**
 * 绑定回调响应
 */
export interface LinkCallbackResponse {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * 直接绑定响应（Telegram/Discord 等 Hosting-side 绑定）
 */
export interface DirectLinkResponse {
  success: boolean;
  message?: string;
}

/**
 * 绑定配置响应（后端返回的 provider 配置）
 */
export interface LinkConfigResponse {
  providers: {
    telegram?: { botUsername: string };
    discord?: { clientId: string };
    [key: string]: { botUsername?: string; clientId?: string; oauthUrl?: string } | undefined;
  };
}

/**
 * Telegram Login Widget 认证数据
 */
export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Provider 信息（用于 UI 显示）
 */
export interface ProviderInfo {
  id: OAuthProvider;
  name: string;
  icon: string;
  color: string;
}

/**
 * Simple Icons CDN - SVG icons with custom colors
 * Format: https://cdn.simpleicons.org/{icon}/{color}
 */
const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org';

/**
 * 支持的 Provider 列表
 * 使用 Simple Icons CDN，图标颜色为品牌官方色，确保在各种背景下清晰可见
 */
export const SUPPORTED_PROVIDERS: ProviderInfo[] = [
  { id: 'discord', name: 'Discord', icon: `${SIMPLE_ICONS_CDN}/discord/5865F2`, color: '#5865F2' },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: `${SIMPLE_ICONS_CDN}/telegram/26A5E4`,
    color: '#26A5E4',
  },
  { id: 'google', name: 'Google', icon: `${SIMPLE_ICONS_CDN}/google/4285F4`, color: '#4285F4' },
  { id: 'github', name: 'GitHub', icon: `${SIMPLE_ICONS_CDN}/github/8B949E`, color: '#8B949E' },
  { id: 'apple', name: 'Apple', icon: `${SIMPLE_ICONS_CDN}/apple/A2AAAD`, color: '#A2AAAD' },
  { id: 'wechat', name: 'WeChat', icon: `${SIMPLE_ICONS_CDN}/wechat/07C160`, color: '#07C160' },
];

/**
 * 根据 provider ID 获取 Provider 信息
 */
export function getProviderInfo(providerId: OAuthProvider): ProviderInfo | undefined {
  return SUPPORTED_PROVIDERS.find(p => p.id === providerId);
}
