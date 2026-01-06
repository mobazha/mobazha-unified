/**
 * 主题系统类型定义
 */

// 主题模式
export type ThemeMode = 'light' | 'dark' | 'system';

// 主题名称
export type ThemeName =
  | 'classic' // 经典青橙
  | 'crypto' // 暗夜交易
  | 'business' // 商务蓝调
  | 'cyberpunk' // 赛博朋克
  | 'nature' // 信任绿洲
  | 'luxury'; // 极简黑金

// 主题颜色定义
export interface ThemeColors {
  // 主要色彩
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // 次要色彩
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;

  // 强调色
  accent: string;

  // 功能色
  success: string;
  warning: string;
  error: string;
  info: string;

  // 背景色
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceHover: string;

  // 文字色
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // 边框色
  border: string;
  borderLight: string;

  // 特殊效果
  glow?: string;
  gradient?: string;
}

// 主题对象
export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  icon: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  fonts?: {
    heading?: string;
    body?: string;
    mono?: string;
  };
}

// 主题配置
export interface ThemeConfig {
  theme: ThemeName;
  mode: ThemeMode;
}

// 支持的主题列表
export const SUPPORTED_THEMES: ThemeName[] = [
  'classic',
  'crypto',
  'business',
  'cyberpunk',
  'nature',
  'luxury',
];

// 主题显示信息
export const THEME_INFO: Record<
  ThemeName,
  { displayName: string; description: string; icon: string }
> = {
  classic: {
    displayName: '经典青橙',
    description: 'Mobazha 品牌经典配色，清新活力',
    icon: '🌊',
  },
  crypto: {
    displayName: '暗夜交易',
    description: '深色背景配霓虹绿，加密交易者的最爱',
    icon: '🌙',
  },
  business: {
    displayName: '商务蓝调',
    description: '专业稳重的蓝色调，适合正式商业交易',
    icon: '💼',
  },
  cyberpunk: {
    displayName: '赛博朋克',
    description: '紫粉渐变的科技感，适合 NFT 和数字艺术',
    icon: '🎮',
  },
  nature: {
    displayName: '信任绿洲',
    description: '森林绿色调，传递信任与可持续理念',
    icon: '🌿',
  },
  luxury: {
    displayName: '极简黑金',
    description: '黑金配色，适合高端商品和奢侈品交易',
    icon: '⚜️',
  },
};
