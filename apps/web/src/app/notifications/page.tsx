'use client';

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { toast } from '@/components/ui/use-toast';
import { useChatStore, useNotifications, useI18n } from '@mobazha/core';
import type { NotificationData } from '@mobazha/core';

// ============ 类型映射 ============

type DisplayNotificationType = 'order' | 'payment' | 'dispute' | 'follow' | 'message' | 'system';

// 事件类型到显示类型的详细映射
function getDisplayType(notification: NotificationData): DisplayNotificationType {
  switch (notification.type) {
    case 'newOrder':
    case 'orderFunded':
    case 'orderConfirmation':
    case 'orderDeclined':
    case 'orderCancel':
    case 'orderFulfillment':
    case 'orderCompletion':
      return 'order';
    case 'orderPaymentReceived':
    case 'refund':
      return 'payment';
    case 'disputeOpen':
    case 'caseOpen':
    case 'caseUpdate':
    case 'disputeClose':
    case 'disputeAccepted':
    case 'vendorFinalizedPayment':
      return 'dispute';
    case 'follow':
    case 'unfollow':
    case 'moderatorAdd':
    case 'moderatorRemove':
      return 'follow';
    default:
      return 'system';
  }
}

// ============ 图标配置 ============

const typeIcons: Record<DisplayNotificationType, React.ReactNode> = {
  order: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  ),
  payment: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  dispute: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  follow: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  ),
  message: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  system: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

const typeColors: Record<DisplayNotificationType, string> = {
  order: 'bg-blue-500',
  payment: 'bg-emerald-500',
  dispute: 'bg-red-500',
  follow: 'bg-purple-500',
  message: 'bg-indigo-500',
  system: 'bg-slate-500',
};

// ============ 时间格式化 ============

function formatTimestamp(timestamp: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  if (days < 7) return t('time.daysAgo', { count: days });
  return date.toLocaleDateString();
}

// ============ 主组件 ============

export default function NotificationsPage() {
  const { t } = useI18n();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getDisplayData,
  } = useNotifications();

  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const openChatDrawer = useChatStore(state => state.openDrawer);

  // 过滤通知
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  // 获取通知链接
  const getNotificationLink = useCallback(
    (notification: NotificationData): string => {
      const displayData = getDisplayData(notification);
      return displayData.route || '/notifications';
    },
    [getDisplayData]
  );

  // 获取通知标题
  const getNotificationTitle = useCallback(
    (notification: NotificationData): string => {
      const displayData = getDisplayData(notification);
      if (displayData.name) {
        return `${displayData.name} ${displayData.text}`;
      }
      return displayData.text || notification.type;
    },
    [getDisplayData]
  );

  // 处理标记已读
  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      await markAsRead(notificationId);
    },
    [markAsRead]
  );

  // 处理标记全部已读
  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
    toast({ title: 'All notifications marked as read' });
  }, [markAllAsRead]);

  // 处理删除通知
  const handleDeleteNotification = useCallback(
    (notificationId: string) => {
      deleteNotification(notificationId);
      toast({ title: 'Notification deleted' });
    },
    [deleteNotification]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="md">
          {/* Page Header */}
          <HStack justify="between" align="center" className="mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('notifications.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? t('common.loading')
                  : unreadCount > 0
                    ? t('notifications.unreadCount', { count: unreadCount })
                    : t('notifications.allCaughtUp')}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs sm:text-sm"
              >
                {t('notifications.markAllRead')}
              </Button>
            )}
          </HStack>

          {/* Filter Tabs */}
          <Card className="mb-4 sm:mb-6 p-2 sm:p-4">
            <HStack gap="xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-feedback ${
                  filter === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'text-muted-foreground hover:bg-surface-hover'
                }`}
              >
                {t('notifications.filterAll')} ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-feedback ${
                  filter === 'unread'
                    ? 'bg-emerald-600 text-white'
                    : 'text-muted-foreground hover:bg-surface-hover'
                }`}
              >
                {t('notifications.filterUnread')} ({unreadCount})
              </button>
            </HStack>
          </Card>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <Card className="text-center py-10 sm:py-16">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
                {filter === 'unread' ? t('notifications.noUnread') : t('notifications.noNotifications')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filter === 'unread'
                  ? t('notifications.allCaughtUp')
                  : t('notifications.newNotificationsDesc')}
              </p>
            </Card>
          ) : (
            <VStack gap="xs">
              {filteredNotifications.map(notification => {
                const displayType = getDisplayType(notification);
                const title = getNotificationTitle(notification);
                const link = getNotificationLink(notification);

                return (
                  <Card
                    key={notification.id}
                    className={`transition-all p-3 sm:p-4 ${!notification.read ? 'border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                  >
                    <HStack gap="sm" align="start">
                      {/* Icon */}
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${typeColors[displayType]}`}
                      >
                        <span className="scale-75 sm:scale-100">{typeIcons[displayType]}</span>
                      </div>

                      {/* Content */}
                      <Link
                        href={link}
                        onClick={e => {
                          handleMarkAsRead(notification.id);
                          if (displayType === 'message') {
                            e.preventDefault();
                            openChatDrawer();
                          }
                        }}
                        className="flex-1 min-w-0 touch-feedback"
                      >
                        <HStack justify="between" align="start">
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-medium text-sm sm:text-base ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}
                            >
                              {title}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-0.5">
                              {formatTimestamp(notification.timestamp, t)}
                            </p>
                          </div>

                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                          )}
                        </HStack>
                      </Link>

                      {/* Actions */}
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 touch-feedback"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </HStack>
                  </Card>
                );
              })}
            </VStack>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
