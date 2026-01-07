'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, HStack } from '@mobazha/ui';
import { Button, Input, Avatar } from '@mobazha/ui';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { useI18n } from '@mobazha/core';

export const Header: React.FC = () => {
  const router = useRouter();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-lg border-b border-border tap-highlight-none">
      <Container size="xl">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm">
              <span className="text-text-inverse font-bold text-lg">M</span>
            </div>
            <span className="font-bold text-xl text-text-primary hidden sm:block">Mobazha</span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <Input
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              fullWidth
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </form>

          {/* Navigation - Desktop */}
          <HStack gap="sm" className="hidden md:flex">
            <Link href="/marketplace">
              <Button variant="ghost" size="sm">
                {t('footer.marketplace')}
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="ghost" size="sm">
                {t('nav.messages')}
              </Button>
            </Link>
            <Link href="/wallet">
              <Button variant="ghost" size="sm">
                {t('nav.wallet')}
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="ghost" size="sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </Button>
            </Link>
            <div className="w-px h-6 bg-border mx-2" />
            {/* Theme Switcher */}
            <ThemeSwitcher compact />
            <Link href="/profile">
              <Avatar name="Guest" size="sm" />
            </Link>
          </HStack>

          {/* Mobile Actions */}
          <HStack gap="xs" className="md:hidden">
            {/* Search Button - Mobile */}
            <button
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label={t('common.search')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Theme Switcher - Mobile (compact) */}
            <ThemeSwitcher compact />

            {/* Cart - Mobile */}
            <Link
              href="/cart"
              className="relative p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {/* Cart badge */}
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-text-inverse text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </Link>
          </HStack>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="md:hidden py-3 border-t border-border animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearch}>
              <Input
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                fullWidth
                autoFocus
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                }
              />
            </form>
          </div>
        )}
      </Container>
    </header>
  );
};
