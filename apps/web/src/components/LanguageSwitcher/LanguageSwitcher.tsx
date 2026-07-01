'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@mobazha/ui/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  /** 紧凑模式（只显示国旗） */
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  compact = false,
}) => {
  const { locale, setLocale, supportedLocales, localeInfo } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (dropdownRef.current && target && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLocaleInfo = localeInfo[locale];

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-muted hover:bg-muted/80',
          'text-foreground text-sm font-medium',
          'transition-colors duration-200',
          compact && 'gap-1 px-1.5 py-1.5'
        )}
        aria-label="Change language"
      >
        <span className={cn('text-lg', compact && 'text-base')}>{currentLocaleInfo.flag}</span>
        {!compact && <span>{currentLocaleInfo.nativeName}</span>}
        {!compact && (
          <svg
            className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-40 py-1',
            'bg-card rounded-lg shadow-lg',
            'border border-border',
            'z-50 animate-in fade-in slide-in-from-top-2 duration-200'
          )}
        >
          {supportedLocales.map(loc => {
            const info = localeInfo[loc];
            const isActive = loc === locale;

            return (
              <button
                key={loc}
                onClick={() => {
                  setLocale(loc);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-left',
                  'hover:bg-surface-hover',
                  'transition-colors duration-150',
                  isActive && 'bg-primary/15 text-primary'
                )}
              >
                <span className="text-lg">{info.flag}</span>
                <span className="text-sm font-medium">{info.nativeName}</span>
                {isActive && (
                  <svg
                    className="w-4 h-4 ml-auto text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
