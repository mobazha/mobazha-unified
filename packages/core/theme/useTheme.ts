'use client';

/**
 * useTheme Hook
 * 主题状态管理，支持主题切换、模式切换、持久化存储
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeMode, ThemeName, ThemeConfig, Theme, ThemeColors } from './types';
import { themes } from './themes';

const THEME_STORAGE_KEY = 'mobazha-theme';
const MODE_STORAGE_KEY = 'mobazha-theme-mode';

/**
 * 获取系统主题模式
 */
function getSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
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

/**
 * 应用主题到 DOM
 */
function applyThemeToDOM(themeName: ThemeName, mode: 'light' | 'dark', colors: ThemeColors) {
  const root = document.documentElement;

  // 设置暗色模式 class
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // 设置主题属性
  root.setAttribute('data-theme', themeName);

  // 设置 CSS 变量
  const cssVars = colorsToCssVars(colors);
  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // 更新 meta theme-color
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

  // 监听系统主题变化
  useEffect(() => {
    if (config.mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedMode(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
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
