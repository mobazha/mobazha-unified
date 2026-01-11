'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, Package, AlertTriangle, UserPlus, MessageSquare, CreditCard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications, useUnreadNotificationCount, getNotificationCategory } from '@mobazha/core';
import type { NotificationData, NotificationCategory } from '@mobazha/core';
import { cn } from '@/lib/utils';

/**
 * 获取通知图标
 */
function getNotificationIcon(category: NotificationCategory) {
  switch (category) {
    case 'order':
      return <Package className="h-4 w-4 text-blue-500" />;
    case 'dispute':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'social':
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case 'chat':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'wallet':
      return <CreditCard className="h-4 w-4 text-emerald-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

/**
 * 格式化时间
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * 通知项组件
 */
function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: NotificationData;
  onMarkAsRead: (id: string) => void;
}) {
  const category = getNotificationCategory(notification.type);
  const icon = getNotificationIcon(category);

  // 生成通知文本
  const getNotificationText = () => {
    switch (notification.type) {
      case 'newOrder':
        return 'You received a new order';
      case 'orderPaymentReceived':
      case 'orderFunded':
        return 'Payment received';
      case 'orderConfirmation':
        return 'Order confirmed';
      case 'orderFulfillment':
        return 'Order fulfilled';
      case 'orderCompletion':
        return 'Order completed';
      case 'disputeOpen':
      case 'caseOpen':
        return 'Dispute opened';
      case 'disputeClose':
        return 'Dispute resolved';
      case 'follow':
        return 'Someone followed you';
      case 'unfollow':
        return 'Someone unfollowed you';
      default:
        return notification.type;
    }
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        notification.read ? 'bg-transparent hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10'
      )}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-tight',
            notification.read ? 'text-text-secondary' : 'text-text-primary font-medium'
          )}
        >
          {getNotificationText()}
        </p>
        <p className="text-xs text-text-tertiary mt-1">{formatTimeAgo(notification.timestamp)}</p>
      </div>
      {!notification.read && (
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={e => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface NotificationDropdownProps {
  className?: string;
}

/**
 * 通知下拉面板组件
 *
 * 提供更好的桌面端用户体验，点击通知图标时显示下拉面板而不是跳转页面
 */
export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();
  const { notifications, isLoading, markAsRead, markAllAsRead, fetchNotifications } = useNotifications({
    autoLoad: false, // 手动控制加载
    enableRealtime: true,
  });

  // 打开时加载通知
  useEffect(() => {
    if (open) {
      void fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // 只显示最近 10 条通知
  const recentNotifications = notifications.slice(0, 10);
  const hasUnread = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'hover:bg-primary/10 hover:text-primary transition-colors relative',
            className
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text-primary">Notifications</h3>
          <div className="flex items-center gap-1">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-10 w-10 text-text-tertiary mb-3" />
              <p className="text-text-secondary font-medium">No notifications</p>
              <p className="text-xs text-text-tertiary mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="p-2">
              {recentNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Link href="/notifications" className="block">
                <Button
                  variant="ghost"
                  className="w-full h-9 text-sm text-primary hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  View all notifications
                </Button>
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationDropdown;
