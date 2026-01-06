'use client';

/**
 * ThemeSwitcher 组件
 * 主题选择器，支持主题切换和亮/暗模式切换
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeName, ThemeMode, THEME_INFO } from '@mobazha/core';

interface ThemeSwitcherProps {
  /** 是否只显示模式切换（简洁模式） */
  compact?: boolean;
  /** 自定义类名 */
  className?: string;
}

const modeOptions: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: '浅色', icon: '☀️' },
  { value: 'dark', label: '深色', icon: '🌙' },
  { value: 'system', label: '跟随系统', icon: '💻' },
];

export function ThemeSwitcher({ compact = false, className = '' }: ThemeSwitcherProps) {
  const { theme, mode, setTheme, setMode, themes, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 紧凑模式：只显示暗色模式切换按钮
  if (compact) {
    return (
      <button
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        className={`p-2 rounded-lg transition-colors hover:bg-surface-hover ${className}`}
        aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      >
        <span className="text-xl">{isDark ? '☀️' : '🌙'}</span>
      </button>
    );
  }

  const currentThemeInfo = THEME_INFO[theme];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border transition-colors"
      >
        <span className="text-xl">{currentThemeInfo?.icon}</span>
        <span className="text-sm font-medium text-text-primary hidden sm:block">
          {currentThemeInfo?.displayName}
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
          {/* 主题选择 */}
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-text-secondary mb-3">选择主题</h3>
            <div className="grid grid-cols-2 gap-2">
              {themes.map(t => (
                <button
                  key={t.name}
                  onClick={() => {
                    setTheme(t.name as ThemeName);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    theme === t.name
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-background-alt hover:bg-surface-hover border-2 border-transparent'
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {t.displayName}
                    </p>
                    <p className="text-xs text-text-muted truncate">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 模式选择 */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-3">显示模式</h3>
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

          {/* 颜色预览 */}
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
