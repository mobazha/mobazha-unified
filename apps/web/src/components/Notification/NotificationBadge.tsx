'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUnreadNotificationCount } from '@mobazha/core';
import { Bell } from 'lucide-react';

interface NotificationBadgeProps {
  /** 自定义类名 */
  className?: string;
  /** 是否显示为图标按钮 */
  iconOnly?: boolean;
  /** 点击回调（如果不提供，则使用 Link 导航） */
  onClick?: () => void;
}

/**
 * 通知徽章组件
 *
 * 显示通知图标和未读数量
 */
export function NotificationBadge({ className, iconOnly = true, onClick }: NotificationBadgeProps) {
  const unreadCount = useUnreadNotificationCount();

  const badgeContent = (
    <>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <Button
        variant="ghost"
        size={iconOnly ? 'icon' : 'sm'}
        className={`hover:bg-primary/10 hover:text-primary transition-colors relative ${className || ''}`}
        onClick={onClick}
      >
        {badgeContent}
        {!iconOnly && <span className="ml-2">Notifications</span>}
      </Button>
    );
  }

  return (
    <Link href="/notifications" className={`relative ${className || ''}`}>
      <Button
        variant="ghost"
        size={iconOnly ? 'icon' : 'sm'}
        className="hover:bg-primary/10 hover:text-primary transition-colors relative"
      >
        {badgeContent}
        {!iconOnly && <span className="ml-2">Notifications</span>}
      </Button>
    </Link>
  );
}

export default NotificationBadge;
