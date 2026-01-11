'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useChatStore,
  selectTotalUnreadCount,
  useUserStore,
  useI18n,
  getImageUrl,
} from '@mobazha/core';

interface NavItem {
  labelKey: string; // i18n key
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number;
  isChat?: boolean; // 标记是否是聊天项，用于动态获取未读数
  isMe?: boolean; // 标记是否是"我"项，用于显示用户头像
  isCart?: boolean; // 标记是否是购物车项，用于动态获取商品数量
}

const navItems: NavItem[] = [
  {
    labelKey: 'nav.home',
    href: '/',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 11-1.06 1.06l-.22-.22V19.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75V15a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-6.13l-.22.22a.75.75 0 11-1.06-1.06l8.69-8.69z" />
      </svg>
    ),
  },
  {
    labelKey: 'nav.orders',
    href: '/orders',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    labelKey: 'nav.cart',
    href: '/cart',
    isCart: true, // 标记为购物车项，用于动态获取商品数量
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
      </svg>
    ),
    // badge 由 useCartStore 动态获取
  },
  {
    labelKey: 'chat.title',
    isChat: true, // 使用 drawer 而非路由
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.383c-1.978-.292-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.678 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    labelKey: 'me.title',
    href: '/me',
    isMe: true, // 用于显示用户头像
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

// 需要隐藏底部导航栏的页面路径模式
const HIDE_NAV_PATTERNS = [
  /^\/orders\/[^/]+$/, // 订单详情页 /orders/:orderId
  /^\/chat\/[^/]+$/, // 聊天详情页 /chat/:chatId (如果有)
  /^\/checkout/, // 结账页面（有自己的底部支付栏）
  /^\/payment/, // 支付页面（有自己的底部支付栏）
  /^\/product\/[^/]+$/, // 商品详情页（有自己的底部操作栏）
];

// 需要登录才能显示的导航项 (使用 labelKey)
const AUTH_REQUIRED_LABEL_KEYS = ['nav.orders', 'nav.cart', 'chat.title'];

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { t } = useI18n();
  const openChatDrawer = useChatStore(state => state.openDrawer);
  const drawerOpen = useChatStore(state => state.drawerOpen);
  const totalUnread = useChatStore(selectTotalUnreadCount);
  const { isAuthenticated, profile } = useUserStore();

  // TODO: 接入真实的购物车 store
  // 目前使用 mock 数据，后续应该从 useCartStore 获取商品总数量
  const cartItemCount = 3; // Mock: 购物车中的商品总数量

  // 获取用户头像 URL（和 Me 页面使用相同的方式）
  const userAvatarUrl = getImageUrl(profile?.avatarHashes?.small);

  // 根据登录状态过滤导航项
  const filteredNavItems = navItems.filter(item => {
    if (!isAuthenticated) {
      // 未登录时隐藏需要登录的项
      return !AUTH_REQUIRED_LABEL_KEYS.includes(item.labelKey);
    }
    return true;
  });

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // 检查当前页面是否需要隐藏底部导航栏（有自己的底部操作栏）
  const shouldHideNav = HIDE_NAV_PATTERNS.some(pattern => pattern.test(pathname));

  // 如果需要隐藏，不渲染导航栏
  if (shouldHideNav) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" data-testid="mobile-nav">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-surface/90 backdrop-blur-lg border-t border-border" />

      {/* Safe area padding for iOS */}
      <div className="relative pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {filteredNavItems.map((item, index) => {
            const active = item.isChat ? drawerOpen : isActive(item.href);
            // 动态获取 badge：聊天用未读数，购物车用商品数量，其他用静态值
            const badge = item.isChat ? totalUnread : item.isCart ? cartItemCount : item.badge;

            // Chat 项使用按钮
            if (item.isChat) {
              return (
                <button
                  key={`chat-${index}`}
                  onClick={openChatDrawer}
                  className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                    active ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {/* Icon with badge */}
                  <span className={`relative transition-transform ${active ? 'scale-105' : ''}`}>
                    {active ? item.activeIcon || item.icon : item.icon}
                    {badge !== undefined && badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] mt-1.5 font-medium ${active ? 'font-semibold' : ''}`}
                  >
                    {t(item.labelKey)}
                  </span>
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            }

            // 其他项使用 Link
            // 对于"我"项，如果用户已登录且有头像，显示用户头像
            const showUserAvatar = item.isMe && isAuthenticated && userAvatarUrl;

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  active ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {/* Icon with badge */}
                <span className={`relative transition-transform ${active ? 'scale-105' : ''}`}>
                  {showUserAvatar ? (
                    // 显示用户头像 - 使用和图标相同的视觉大小
                    <div
                      className={`w-6 h-6 rounded-full overflow-hidden ${active ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
                    >
                      <img
                        src={userAvatarUrl}
                        alt={profile?.name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : // 显示默认图标
                  active ? (
                    item.activeIcon || item.icon
                  ) : (
                    item.icon
                  )}
                  {/* Badge - small red circle with number */}
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span className={`text-[10px] mt-1.5 font-medium ${active ? 'font-semibold' : ''}`}>
                  {t(item.labelKey)}
                </span>

                {/* Active indicator */}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
