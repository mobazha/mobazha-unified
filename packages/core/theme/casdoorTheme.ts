/**
 * Casdoor 主题同步工具
 * 用于在跳转 Casdoor 登录页时同步主题配置
 */

// 主题主色调映射（独立定义，避免与 themes.ts 产生类型依赖）
const THEME_PRIMARY_COLORS: Record<string, { light: string; dark: string }> = {
  classic: { light: '#00BCD4', dark: '#26C6DA' },
  crypto: { light: '#00D26A', dark: '#00FF85' },
  business: { light: '#2563EB', dark: '#3B82F6' },
  cyberpunk: { light: '#9333EA', dark: '#A855F7' },
  nature: { light: '#059669', dark: '#34D399' },
  luxury: { light: '#B8860B', dark: '#FFD700' },
};

/**
 * 获取当前主题的 Casdoor 兼容参数
 * 用于在跳转 Casdoor 登录页时同步主题
 */
export function getCasdoorThemeParams(): {
  theme: 'dark' | 'default';
  colorPrimary: string;
  borderRadius: number;
} {
  // 仅在浏览器环境下执行
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {
      theme: 'default',
      colorPrimary: '#00BCD4',
      borderRadius: 8,
    };
  }

  const themeName = localStorage.getItem('mobazha-theme') || 'classic';
  const mode = localStorage.getItem('mobazha-theme-mode') || 'system';

  // 解析实际模式
  let resolvedMode: 'light' | 'dark' = 'light';
  if (mode === 'dark') {
    resolvedMode = 'dark';
  } else if (mode === 'system') {
    resolvedMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // 获取主题颜色
  const themeColors = THEME_PRIMARY_COLORS[themeName] || THEME_PRIMARY_COLORS.classic;
  const colorPrimary = themeColors[resolvedMode];

  return {
    theme: resolvedMode === 'dark' ? 'dark' : 'default',
    colorPrimary,
    borderRadius: 8,
  };
}
