'use client';

/**
 * ThemeSwitcher 组件
 * 主题选择器，支持主题切换和亮/暗模式切换
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeName, ThemeMode, THEME_INFO, useI18n } from '@mobazha/core';

interface ThemeSwitcherProps {
  compact?: boolean;
  className?: string;
}

export function ThemeSwitcher({ compact = false, className = '' }: ThemeSwitcherProps) {
  const { theme, mode, setTheme, setMode, themes, isDark } = useTheme();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (dropdownRef.current && target && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modeOptions: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'light', label: t('settingsExtended.light'), icon: '☀️' },
    { value: 'dark', label: t('settingsExtended.dark'), icon: '🌙' },
    { value: 'system', label: t('settings.system'), icon: '💻' },
  ];

  const getThemeDisplayName = (name: string) =>
    t(`theme.${name}` as Parameters<typeof t>[0]) ||
    THEME_INFO[name as ThemeName]?.displayName ||
    name;
  const getThemeDescription = (name: string) =>
    t(`theme.${name}Desc` as Parameters<typeof t>[0]) ||
    THEME_INFO[name as ThemeName]?.description ||
    '';

  if (compact) {
    if (!mounted) {
      return (
        <button
          className={`p-2 rounded-lg transition-colors hover:bg-surface-hover ${className}`}
          aria-label={t('settings.chooseTheme')}
        >
          <span className="text-xl">🌓</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        className={`p-2 rounded-lg transition-colors hover:bg-surface-hover ${className}`}
        aria-label={isDark ? t('settingsExtended.light') : t('settingsExtended.dark')}
      >
        <span className="text-xl">{isDark ? '☀️' : '🌙'}</span>
      </button>
    );
  }

  const currentThemeInfo = THEME_INFO[theme];

  if (!mounted) {
    return (
      <div className={`relative ${className}`}>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border transition-colors">
          <span className="text-xl">🎨</span>
          <span className="text-sm font-medium text-text-primary hidden sm:block">
            {t('settings.theme')}
          </span>
          <svg
            className="w-4 h-4 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border transition-colors"
      >
        <span className="text-xl">{currentThemeInfo?.icon}</span>
        <span className="text-sm font-medium text-text-primary hidden sm:block">
          {getThemeDisplayName(theme)}
        </span>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              {t('settings.chooseTheme')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {themes.map(themeItem => (
                <button
                  key={themeItem.name}
                  onClick={() => {
                    setTheme(themeItem.name as ThemeName);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    theme === themeItem.name
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-background-alt hover:bg-surface-hover border-2 border-transparent'
                  }`}
                >
                  <span className="text-2xl">{themeItem.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {getThemeDisplayName(themeItem.name)}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {getThemeDescription(themeItem.name)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              {t('settings.displayMode')}
            </h3>
            <div className="flex gap-2">
              {modeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    mode === option.value
                      ? 'bg-primary text-text-inverse'
                      : 'bg-background-alt hover:bg-surface-hover text-text-primary'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-background-alt border-t border-border">
            <div className="flex gap-2">
              {['primary', 'secondary', 'accent', 'success', 'warning', 'error'].map(color => (
                <div
                  key={color}
                  className="w-8 h-8 rounded-full border border-border-light"
                  style={{ backgroundColor: `var(--color-${color})` }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
