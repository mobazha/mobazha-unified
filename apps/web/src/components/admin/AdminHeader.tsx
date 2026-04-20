'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useI18n,
  useUserStore,
  getImageUrl,
  useStorefrontMode,
  useChatStore,
  selectTotalUnreadCount,
} from '@mobazha/core';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Eye, User, LogOut, MessageSquare, MessageCircle } from 'lucide-react';
import { useAIChatStore } from '@mobazha/core/stores';
import { usePlatform } from '@mobazha/ui/hooks';

interface AdminHeaderProps {
  title?: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { profile, logout } = useUserStore();
  const standaloneMode = useStorefrontMode();
  const toggleAIChat = useAIChatStore(s => s.toggle);
  const openChatDrawer = useChatStore(state => state.openDrawer);
  const totalUnread = useChatStore(selectTotalUnreadCount);
  const { shouldUseMobileView, isEmbeddedApp } = usePlatform();
  const [peerIdCopied, setPeerIdCopied] = useState(false);
  const peerID = profile?.peerID;
  const handleCopyPeerID = useCallback(() => {
    if (!peerID) return;
    navigator.clipboard
      .writeText(peerID)
      .then(() => {
        setPeerIdCopied(true);
        setTimeout(() => setPeerIdCopied(false), 2000);
      })
      .catch(() => {});
  }, [peerID]);

  const handleLogout = () => {
    logout('/');
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
      className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-2 sm:px-4 shrink-0 relative z-50"
      data-testid="admin-header"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {isEmbeddedApp ? (
          /* TMA: minimal left side — just the label, no back arrow / logo */
          <span className="font-semibold text-sm text-foreground">{t('admin.title')}</span>
        ) : standaloneMode ? (
          <button
            onClick={handleViewStore}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
            data-testid="admin-back-to-store"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">{t('userMenu.viewStore')}</span>
          </button>
        ) : (
          <>
            <Link
              href="/me"
              className="lg:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-0.5 sm:mr-2"
              data-testid="admin-back-mobile"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
              data-testid="admin-back-to-marketplace"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('admin.nav.backToMarketplace')}</span>
            </Link>
          </>
        )}

        {!isEmbeddedApp && (
          <Link href="/admin" className="lg:hidden flex items-center gap-2">
            <MobazhaLogo size={24} className="text-primary" />
            <span className="font-semibold text-sm text-foreground">{t('admin.title')}</span>
          </Link>
        )}

        {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {!isEmbeddedApp && (
          <button
            onClick={toggleAIChat}
            className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t('ai.openAssistant')}
            data-testid="admin-header-ai-chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/10 hover:text-primary transition-colors relative"
          onClick={shouldUseMobileView ? () => router.push('/chat') : openChatDrawer}
          aria-label={t('nav.openMessages')}
          data-testid="admin-header-chat"
        >
          <MessageCircle className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-error text-error-foreground text-xs font-bold rounded-full">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
        <NotificationDropdown />
        {!isEmbeddedApp && <LanguageSwitcher compact />}
        {!isEmbeddedApp && <ThemeSwitcher compact />}

        {profile && (
          <div className="ml-1 pl-1 sm:ml-2 sm:pl-2 border-l border-border">
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
                    <button
                      onClick={handleCopyPeerID}
                      className="text-xs leading-none text-muted-foreground truncate hover:text-foreground transition-colors text-left flex items-center gap-1 group"
                      title={profile.peerID}
                    >
                      <span>
                        {profile.peerID?.slice(0, 8)}...{profile.peerID?.slice(-4)}
                      </span>
                      {peerIdCopied ? (
                        <svg
                          className="w-3 h-3 text-primary flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
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
