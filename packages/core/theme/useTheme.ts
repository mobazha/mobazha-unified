'use client';

/**
 * useTheme Hook
 * 主题状态管理，支持主题切换、模式切换、持久化存储
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeMode, ThemeName, ThemeConfig, Theme, ThemeColors } from './types';
import { themes } from './themes';
import { getBrandConfig } from '../config/env';

const THEME_STORAGE_KEY = 'mobazha-theme';
const MODE_STORAGE_KEY = 'mobazha-theme-mode';

/**
 * 获取系统主题模式
 * TMA WebView 不一定传播 prefers-color-scheme，优先读取 Telegram SDK 的 colorScheme
 */
function getSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const tgScheme = (window as { Telegram?: { WebApp?: { colorScheme?: string } } }).Telegram?.WebApp
    ?.colorScheme;
  if (tgScheme === 'dark' || tgScheme === 'light') return tgScheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 从 localStorage 获取存储的配置
 */
function getStoredConfig(): ThemeConfig {
  if (typeof window === 'undefined') {
    return { theme: 'classic', mode: 'system' };
  }

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
  const storedMode = localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null;

  return {
    theme: storedTheme || 'classic',
    mode: storedMode || 'system',
  };
}

/**
 * 将颜色对象转换为 CSS 变量
 */
function colorsToCssVars(colors: ThemeColors): Record<string, string> {
  const vars: Record<string, string> = {};
  Object.entries(colors).forEach(([key, value]) => {
    if (value) {
      vars[`--color-${key}`] = value;
    }
  });
  return vars;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '');
  if (m.length !== 6) return null;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(c =>
        Math.max(0, Math.min(255, Math.round(c)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function mixColor(hex: string, target: string, ratio: number): string {
  const c = parseHex(hex),
    t = parseHex(target);
  if (!c || !t) return hex;
  return toHex(
    c[0] + (t[0] - c[0]) * ratio,
    c[1] + (t[1] - c[1]) * ratio,
    c[2] + (t[2] - c[2]) * ratio
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const c = parseHex(hex);
  if (!c) return hex;
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

/**
 * Build CSS variable overrides from brand config.
 * Takes the base theme mode to produce correct light/dark derivations.
 */
function brandColorOverrides(mode: 'light' | 'dark'): Record<string, string> | null {
  const brand = getBrandConfig();
  if (!brand?.primaryColor) return null;

  const p = brand.primaryColor;
  const white = '#FFFFFF',
    black = '#000000';
  const isLight = mode === 'light';

  const overrides: Record<string, string> = {
    '--color-primary': p,
    '--color-primaryLight': mixColor(p, white, 0.3),
    '--color-primaryDark': mixColor(p, black, 0.25),
    '--color-accent': brand.accentColor || p,
  };

  const glow = hexToRgba(p, isLight ? 0.2 : 0.35);
  overrides['--color-glow'] = glow;

  return overrides;
}

/**
 * 应用主题到 DOM
 *
 * In embedded mode (data-embedded="telegram" etc.) the host provider
 * (TGMiniAppProvider) manages the entire palette via --theme-* inline styles.
 * Theme selection UI is hidden in TMA, so we only set structural attributes
 * (.dark class + data-theme) and skip all color writes to avoid clobbering
 * the host palette.
 */
function applyThemeToDOM(themeName: ThemeName, mode: 'light' | 'dark', colors: ThemeColors) {
  const root = document.documentElement;

  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.setAttribute('data-theme', themeName);

  if (root.dataset.embedded) return;

  const cssVars = colorsToCssVars(colors);
  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  const brandOverrides = brandColorOverrides(mode);
  if (brandOverrides) {
    Object.entries(brandOverrides).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', colors.background);
  }
}

export interface UseThemeReturn {
  // 状态
  theme: ThemeName;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  currentTheme: Theme;
  colors: ThemeColors;
  isDark: boolean;

  // 方法
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;

  // 所有主题列表
  themes: Theme[];
}

/**
 * 主题 Hook
 *
 * @example
 * ```tsx
 * const { theme, mode, setTheme, setMode, isDark, toggleDarkMode } = useTheme();
 *
 * // 切换主题
 * setTheme('crypto');
 *
 * // 切换模式
 * setMode('dark');
 *
 * // 切换暗色模式
 * toggleDarkMode();
 * ```
 */
export function useTheme(): UseThemeReturn {
  const [config, setConfig] = useState<ThemeConfig>(() => getStoredConfig());
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(() =>
    config.mode === 'system' ? getSystemMode() : config.mode
  );

  // 当前主题对象
  const currentTheme: Theme = useMemo(() => themes[config.theme] || themes.classic, [config.theme]);

  // 当前颜色
  const colors: ThemeColors = useMemo(
    () => currentTheme.colors[resolvedMode],
    [currentTheme, resolvedMode]
  );

  // TMA 强制 system 模式 — 始终跟随 Telegram 宿主主题
  useEffect(() => {
    const isTMA = !!(window as { Telegram?: { WebApp?: { colorScheme?: string } } }).Telegram
      ?.WebApp?.colorScheme;
    if (isTMA && config.mode !== 'system') {
      setMode('system');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听系统主题变化（含 Telegram themeChanged 事件）
  useEffect(() => {
    if (config.mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedMode(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);

    const tgWebApp = (window as { Telegram?: { WebApp?: Record<string, unknown> } }).Telegram
      ?.WebApp as
      | {
          colorScheme?: string;
          onEvent?: (e: string, cb: () => void) => void;
          offEvent?: (e: string, cb: () => void) => void;
        }
      | undefined;
    const handleTGThemeChange = () => {
      const scheme = tgWebApp?.colorScheme;
      if (scheme === 'dark' || scheme === 'light') setResolvedMode(scheme);
    };
    tgWebApp?.onEvent?.('themeChanged', handleTGThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      tgWebApp?.offEvent?.('themeChanged', handleTGThemeChange);
    };
  }, [config.mode]);

  // 更新 DOM
  useEffect(() => {
    applyThemeToDOM(config.theme, resolvedMode, colors);
  }, [config.theme, resolvedMode, colors]);

  // 切换主题
  const setTheme = useCallback((themeName: ThemeName) => {
    setConfig(prev => ({ ...prev, theme: themeName }));
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }, []);

  // 切换模式
  const setMode = useCallback((mode: ThemeMode) => {
    setConfig(prev => ({ ...prev, mode }));
    localStorage.setItem(MODE_STORAGE_KEY, mode);

    if (mode === 'system') {
      setResolvedMode(getSystemMode());
    } else {
      setResolvedMode(mode);
    }
  }, []);

  // 切换暗色模式
  const toggleDarkMode = useCallback(() => {
    const newMode = resolvedMode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  }, [resolvedMode, setMode]);

  return {
    // 状态
    theme: config.theme,
    mode: config.mode,
    resolvedMode,
    currentTheme,
    colors,
    isDark: resolvedMode === 'dark',

    // 方法
    setTheme,
    setMode,
    toggleDarkMode,

    // 所有主题列表
    themes: Object.values(themes),
  };
}
