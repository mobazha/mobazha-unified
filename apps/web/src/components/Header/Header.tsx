'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
import {
  useI18n,
  useUserStore,
  useCartStore,
  useCartDrawerStore,
  useChatStore,
  selectTotalUnreadCount,
  getImageUrl,
  isHosted,
  isStandalone,
  startCasdoorLogin,
  useUserContext,
} from '@mobazha/core';
import {
  Search,
  ShoppingCart,
  LogIn,
  ShoppingBag,
  LogOut,
  MessageCircle,
  User,
  LayoutDashboard,
  ClipboardList,
  Store,
} from 'lucide-react';
import { NotificationDropdown } from '../Notification';
import { WalletConnectButton } from '../Wallet';
import { CartDrawer } from '../CartDrawer';

export const Header: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { isAuthenticated, profile, isLoading, logout } = useUserStore();
  const { hasStore, isPureSeller, isPureBuyer } = useUserContext();
  const openChatDrawer = useChatStore(state => state.openDrawer);
  const totalUnread = useChatStore(selectTotalUnreadCount);
  const [searchQuery, setSearchQuery] = useState('');
  const cartOpen = useCartDrawerStore(state => state.isOpen);
  const setCartOpen = useCartDrawerStore(state => state.setOpen);
  const cartItemCount = useCartStore(state => state.getItemCount());

  const standaloneMode = isStandalone();
  const isSearchPage = pathname === '/search';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  // 移动端隐藏顶部 Header，使用底部 MobileNav 导航
  return (
    <header
      className="hidden md:block sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border"
      data-testid="header"
    >
      <Container size="xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            {standaloneMode && profile ? (
              <>
                <Avatar
                  src={getImageUrl(profile.avatarHashes?.small)}
                  name={profile.name || ''}
                  size="sm"
                />
                <span className="font-bold text-xl text-foreground">{profile.name}</span>
              </>
            ) : (
              <>
                <MobazhaLogo size={36} className="text-primary" />
                <span className="font-bold text-xl text-foreground">Mobazha</span>
              </>
            )}
          </Link>

          {/* Search Bar - Desktop (hidden in standalone mode and on search results page) */}
          {!standaloneMode && !isSearchPage && (
            <form
              onSubmit={handleSearch}
              className="flex flex-1 max-w-xl mx-8"
              data-testid="header-search-form"
            >
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  className="w-full pl-10"
                  data-testid="header-search-input"
                />
              </div>
            </form>
          )}
          {(standaloneMode || isSearchPage) && <div className="flex-1" />}

          {/* Navigation - Desktop */}
          <HStack gap="sm" className="flex items-center">
            {/* 市场入口 (hidden in standalone mode) */}
            {!standaloneMode && (
              <Link href="/marketplace" data-testid="header-marketplace-link">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {t('footer.marketplace')}
                </Button>
              </Link>
            )}

            {/* 匿名用户：开店入口 (SaaS only) */}
            {!isAuthenticated && !isLoading && !standaloneMode && (
              <Link href="/login?redirect=%2Fadmin" data-testid="header-start-selling-link">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {t('footer.startSelling')}
                </Button>
              </Link>
            )}

            {/* 卖家：店铺管理入口 */}
            {isAuthenticated && hasStore && !isPureBuyer && (
              <Link href="/admin" data-testid="header-admin-link">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden lg:inline">{t('admin.title')}</span>
                </Button>
              </Link>
            )}

            {/* 已登录：订单入口 */}
            {isAuthenticated && !hasStore && (
              <Link href="/orders" data-testid="header-orders-link">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-primary/10 hover:text-primary transition-colors"
                  aria-label={t('userMenu.myOrders')}
                >
                  <ClipboardList className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {/* 已登录用户：通知、消息、钱包 */}
            {isAuthenticated && (
              <>
                <NotificationDropdown />

                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-primary/10 hover:text-primary transition-colors relative"
                  onClick={openChatDrawer}
                  aria-label={t('nav.openMessages')}
                  data-testid="header-messages-btn"
                >
                  <MessageCircle className="h-5 w-5" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-error text-error-foreground text-xs font-bold rounded-full">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </Button>
              </>
            )}

            {/* 购物车 — 对所有用户可见（数据在 localStorage） */}
            <button
              className="relative"
              data-testid="header-cart-link"
              onClick={() => setCartOpen(true)}
            >
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label={t('nav.viewCart')}
                asChild
              >
                <span>
                  <ShoppingCart className="h-5 w-5" />
                </span>
              </Button>
              {cartItemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  data-testid="header-cart-badge"
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>
            <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

            {/* 已登录：钱包连接 */}
            {isAuthenticated && <WalletConnectButton />}

            {/* 语言 & 主题切换 */}
            <LanguageSwitcher compact />
            <ThemeSwitcher compact />
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated && profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-8 w-8 p-0 hover:opacity-80 transition-opacity focus:outline-none ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full"
                    aria-label={t('nav.openUserMenu')}
                    data-testid="header-user-menu-trigger"
                  >
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

                  {/* 卖家核心入口 */}
                  {hasStore && !isPureBuyer && (
                    <>
                      <DropdownMenuItem
                        onClick={() => router.push('/admin')}
                        className="cursor-pointer"
                        data-testid="header-menu-admin"
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {t('admin.title')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* SaaS 用户无店铺：Start Selling 入口 */}
                  {!hasStore && !isPureBuyer && !standaloneMode && (
                    <>
                      <DropdownMenuItem
                        onClick={() => router.push('/admin')}
                        className="cursor-pointer"
                        data-testid="header-menu-start-selling"
                      >
                        <Store className="mr-2 h-4 w-4" />
                        {t('userMenu.startSelling')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* 买家购买订单（hosted 模式双角色也显示） */}
                  {!isPureSeller && (
                    <>
                      <DropdownMenuItem
                        onClick={() => router.push('/orders?tab=purchases')}
                        className="cursor-pointer"
                        data-testid="header-menu-orders"
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        {t('userMenu.myOrders')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem
                    onClick={() => router.push('/settings/general')}
                    className="cursor-pointer"
                    data-testid="header-menu-settings"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t('userMenu.account')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                    data-testid="header-menu-logout"
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
                data-testid="header-login-btn"
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
