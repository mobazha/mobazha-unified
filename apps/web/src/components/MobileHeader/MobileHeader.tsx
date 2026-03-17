'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layouts';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n, useUserStore, getImageUrl, isStandalone, useUserContext } from '@mobazha/core';
import { Search, ScanLine, LayoutDashboard } from 'lucide-react';

export const MobileHeader: React.FC = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { profile, isAuthenticated } = useUserStore();
  const { hasStore } = useUserContext();
  const [searchQuery, setSearchQuery] = useState('');
  const standaloneMode = isStandalone();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleScan = () => {
    // TODO: 实现扫码功能
    console.log('Scan QR code');
  };

  return (
    <header className="md:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <Container size="xl">
        <div className="flex items-center gap-2 h-14 py-2">
          {standaloneMode ? (
            <>
              <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
                {profile ? (
                  <>
                    <Avatar
                      src={getImageUrl(profile.avatarHashes?.small)}
                      name={profile.name || ''}
                      size="sm"
                    />
                    <span className="font-bold text-base text-foreground truncate">
                      {profile.name}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                    <div className="w-24 h-4 rounded bg-muted animate-pulse" />
                  </>
                )}
              </Link>
              {isAuthenticated && hasStore && (
                <Link
                  href="/admin"
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-hover active:bg-surface-hover transition-colors"
                  aria-label={t('admin.title')}
                >
                  <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                </Link>
              )}
            </>
          ) : (
            <>
              <form onSubmit={handleSearch} className="flex-1 min-w-0">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('search.placeholder')}
                    enterKeyHint="search"
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
              </form>

              {isAuthenticated && (
                <Link
                  href="/admin"
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-hover active:bg-surface-hover transition-colors"
                  aria-label={t('userMenu.myStore')}
                >
                  <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                </Link>
              )}

              <button
                onClick={handleScan}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-hover active:bg-surface-hover transition-colors touch-feedback"
                aria-label={t('common.scan')}
              >
                <ScanLine className="h-5 w-5 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
};
