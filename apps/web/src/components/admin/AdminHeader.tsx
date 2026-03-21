'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n, useUserStore, getImageUrl, isStandalone } from '@mobazha/core';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { NotificationDropdown } from '../Notification';
import { ArrowLeft, Eye, User, LogOut } from 'lucide-react';

interface AdminHeaderProps {
  title?: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { profile, logout } = useUserStore();
  const standaloneMode = isStandalone();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleViewStore = () => {
    if (profile?.peerID) {
      router.push(`/store/${profile.peerID}`);
    } else if (standaloneMode) {
      router.push('/');
    }
  };

  return (
    <header
      className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 shrink-0"
      data-testid="admin-header"
    >
      <div className="flex items-center gap-3">
        {standaloneMode ? (
          <button
            onClick={handleViewStore}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
            data-testid="admin-back-to-store"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">{t('userMenu.viewStore')}</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
            data-testid="admin-back-to-marketplace"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('admin.nav.backToMarketplace')}</span>
          </Link>
        )}

        <Link href="/admin" className="lg:hidden flex items-center gap-2">
          <MobazhaLogo size={24} className="text-primary" />
          <span className="font-semibold text-sm text-foreground">{t('admin.title')}</span>
        </Link>

        {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <NotificationDropdown />
        <LanguageSwitcher compact />
        <ThemeSwitcher compact />

        {profile && (
          <div className="ml-2 pl-2 border-l border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none rounded-full"
                  aria-label="Open user menu"
                  data-testid="admin-header-user-menu-trigger"
                >
                  <Avatar
                    src={getImageUrl(profile.avatarHashes?.small)}
                    name={profile.name || t('common.seller')}
                    size="sm"
                  />
                  <span className="hidden sm:block text-sm font-medium text-foreground truncate max-w-[120px]">
                    {profile.name || t('common.seller')}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {profile.peerID?.slice(0, 8)}...{profile.peerID?.slice(-4)}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleViewStore}
                  className="cursor-pointer"
                  data-testid="admin-menu-view-store"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('userMenu.viewStore')}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.push('/settings/general')}
                  className="cursor-pointer"
                  data-testid="admin-menu-settings"
                >
                  <User className="mr-2 h-4 w-4" />
                  {t('userMenu.account')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  data-testid="admin-menu-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('userMenu.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}

export default AdminHeader;
