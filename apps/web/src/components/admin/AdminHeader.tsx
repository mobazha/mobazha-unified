'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n, useUserStore, getImageUrl } from '@mobazha/core';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface AdminHeaderProps {
  title?: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  const { t } = useI18n();
  const { profile } = useUserStore();

  return (
    <header
      className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 shrink-0"
      data-testid="admin-header"
    >
      <div className="flex items-center gap-3">
        {/* Mobile: show logo (bottom tabs replace hamburger) */}
        <Link href="/admin" className="lg:hidden flex items-center gap-2">
          <MobazhaLogo size={24} className="text-primary" />
          <span className="font-semibold text-sm text-foreground">{t('admin.title')}</span>
        </Link>

        {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher compact />
        <ThemeSwitcher compact />

        {profile && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
            <Avatar
              src={getImageUrl(profile.avatarHashes?.small)}
              name={profile.name || t('common.seller')}
              size="sm"
            />
            <span className="hidden sm:block text-sm font-medium text-foreground truncate max-w-[120px]">
              {profile.name || t('common.seller')}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

export default AdminHeader;
