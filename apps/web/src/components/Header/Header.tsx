'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
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
import { useSettingsDrawer } from '../SettingsDrawer';
import {
  useI18n,
  useUserStore,
  useChatStore,
  selectTotalUnreadCount,
  getImageUrl,
  isHosted,
  startCasdoorLogin,
} from '@mobazha/core';
import {
  Search,
  ShoppingCart,
  LogIn,
  Store,
  Plus,
  Package,
  ShoppingBag,
  Settings,
  LogOut,
  MessageCircle,
  Shield,
  PieChart,
} from 'lucide-react';
import { NotificationDropdown } from '../Notification';
import { WalletConnectButton } from '../Wallet';

export const Header: React.FC = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { isAuthenticated, profile, isLoading, logout } = useUserStore();
  const openChatDrawer = useChatStore(state => state.openDrawer);
  const totalUnread = useChatStore(selectTotalUnreadCount);
  const { openSettings } = useSettingsDrawer();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // 移动端隐藏顶部 Header，使用底部 MobileNav 导航
  return (
    <header className="hidden md:block sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
      <Container size="xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <MobazhaLogo size={36} className="text-primary" />
            <span className="font-bold text-xl text-foreground">Mobazha</span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                className="w-full pl-10"
              />
            </div>
          </form>

          {/* Navigation - Desktop */}
          <HStack gap="sm" className="flex items-center">
            {/* 市场入口 */}
            <Link href="/marketplace">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {t('footer.marketplace')}
              </Button>
            </Link>

            {/* 已登录用户显示：通知、消息、购物车 */}
            {isAuthenticated && (
              <>
                {/* 通知下拉面板 */}
                <NotificationDropdown />

                {/* 消息图标 + 未读徽章 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-primary/10 hover:text-primary transition-colors relative"
                  onClick={openChatDrawer}
                >
                  <MessageCircle className="h-5 w-5" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </Button>

                {/* 购物车图标 + 数量徽章 */}
                <Link href="/cart" className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    3
                  </span>
                </Link>
              </>
            )}

            {/* 钱包连接 - 使用 AppKit 原生组件，包含余额显示 */}
            <WalletConnectButton />

            {/* 语言 & 主题切换 */}
            <LanguageSwitcher compact />
            <ThemeSwitcher compact />
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated && profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full">
                    <Avatar
                      src={getImageUrl(profile.avatarHashes?.small)}
                      name={profile.name || 'User'}
                      size="sm"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* 用户信息 */}
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile.name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {profile.peerID?.slice(0, 8)}...{profile.peerID?.slice(-4)}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* 主要操作 */}
                  <DropdownMenuItem
                    onClick={() => router.push(`/store/${profile.peerID}`)}
                    className="cursor-pointer"
                  >
                    <Store className="mr-2 h-4 w-4" />
                    {t('userMenu.myStore')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push('/listing/new')}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('userMenu.createListing')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  {/* 订单管理 */}
                  <DropdownMenuItem
                    onClick={() => router.push('/orders?tab=sales')}
                    className="cursor-pointer"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {t('userMenu.sales')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push('/orders?tab=purchases')}
                    className="cursor-pointer"
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    {t('userMenu.purchases')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push('/rwa-dashboard')}
                    className="cursor-pointer"
                  >
                    <PieChart className="mr-2 h-4 w-4" />
                    RWA 资产
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  {/* 系统操作 */}
                  <DropdownMenuItem
                    onClick={() => openSettings('general')}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {t('userMenu.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openSettings('accessControl')}
                    className="cursor-pointer"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {t('settings.sidebar.accessControl')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('userMenu.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => {
                  // hosted 模式直接跳转 Casdoor，无需中间页
                  if (isHosted()) {
                    startCasdoorLogin();
                  } else {
                    router.push('/login');
                  }
                }}
              >
                <LogIn className="h-4 w-4" />
                {t('nav.login')}
              </Button>
            )}
          </HStack>
        </div>
      </Container>
    </header>
  );
};
