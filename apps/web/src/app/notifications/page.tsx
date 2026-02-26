'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useChatStore, useNotifications, useI18n, getNotificationRoute } from '@mobazha/core';
import type { NotificationFilter, Notification } from '@mobazha/core';
import {
  NotificationCard,
  OrderNotificationCard,
  FollowNotificationCard,
  DisputeNotificationCard,
} from '@/components/Notification';
import { Bell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ 分类标签配置 ============

interface TabConfig {
  key: NotificationFilter;
  labelKey: string;
}

const TABS: TabConfig[] = [
  { key: 'all', labelKey: 'notifications.tabAll' },
  { key: 'orders', labelKey: 'notifications.tabOrders' },
  { key: 'followers', labelKey: 'notifications.tabFollowers' },
];

// ============ 主组件 ============

export default function NotificationsPage() {
  const { t } = useI18n();
  const {
    apiNotifications,
    unreadCount,
    isLoading,
    hasMore,
    currentFilter,
    total,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    setFilter,
  } = useNotifications({ autoLoad: true, pageSize: 20 });

  const openChatDrawer = useChatStore(state => state.openDrawer);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 无限滚动监听
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          void loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

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
    toast({ title: t('notifications.allMarkedRead') });
  }, [markAllAsRead, t]);

  // 处理删除通知
  const handleDeleteNotification = useCallback(
    (notificationId: string) => {
      deleteNotification(notificationId);
      toast({ title: t('notifications.notificationDeleted') });
    },
    [deleteNotification, t]
  );

  // 处理通知点击
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      // 标记已读
      if (!notification.read) {
        void handleMarkAsRead(notification.id);
      }
      // 如果是消息类型，打开聊天
      if (notification.type === 'chat.message') {
        openChatDrawer();
      }
    },
    [handleMarkAsRead, openChatDrawer]
  );

  // 渲染通知卡片
  const renderNotificationCard = useCallback(
    (notification: Notification) => {
      const route = getNotificationRoute(notification);
      const isOrderType =
        notification.type.startsWith('order.') || notification.type.startsWith('payment.');

      const isFollowType = notification.type.startsWith('social.');

      const isDisputeType = notification.type.startsWith('dispute.');

      if (isOrderType) {
        return (
          <OrderNotificationCard
            key={notification.id}
            notification={notification}
            route={route}
            onClick={() => handleNotificationClick(notification)}
            onMarkAsRead={handleMarkAsRead}
          />
        );
      }

      if (isFollowType) {
        return (
          <FollowNotificationCard
            key={notification.id}
            notification={notification}
            route={route}
            onClick={() => handleNotificationClick(notification)}
            onMarkAsRead={handleMarkAsRead}
          />
        );
      }

      if (isDisputeType) {
        return (
          <DisputeNotificationCard
            key={notification.id}
            notification={notification}
            route={route}
            onClick={() => handleNotificationClick(notification)}
            onMarkAsRead={handleMarkAsRead}
          />
        );
      }

      return (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onClick={() => handleNotificationClick(notification)}
          onMarkAsRead={handleMarkAsRead}
        />
      );
    },
    [handleNotificationClick, handleMarkAsRead]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('notifications.title')} />

      <main className="py-4 sm:py-8">
        <Container size="md">
          {/* Page Header — hidden on mobile where MobilePageHeader is shown */}
          <HStack justify="between" align="center" className="mb-4 sm:mb-6">
            <div>
              <h1 className="hidden lg:block text-xl sm:text-2xl font-bold text-foreground">
                {t('notifications.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLoading && apiNotifications.length === 0
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

          {/* Category Tabs */}
          <Card className="mb-4 sm:mb-6 p-2 sm:p-4">
            <HStack gap="xs" className="flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-feedback',
                    currentFilter === tab.key
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-surface-hover'
                  )}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </HStack>
          </Card>

          {/* Notifications List */}
          {apiNotifications.length === 0 && !isLoading ? (
            <Card className="text-center py-10 sm:py-16">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
                {currentFilter === 'orders'
                  ? t('notifications.noOrderNotifications')
                  : currentFilter === 'followers'
                    ? t('notifications.noFollowerNotifications')
                    : t('notifications.noNotifications')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('notifications.newNotificationsDesc')}
              </p>
            </Card>
          ) : (
            <VStack gap="xs">
              {apiNotifications.map(notification => (
                <Card
                  key={notification.id}
                  className={cn(
                    'transition-all overflow-hidden',
                    !notification.read && 'ring-1 ring-primary/20'
                  )}
                >
                  <div className="relative group">
                    {renderNotificationCard(notification)}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      aria-label={t('common.delete')}
                      className="absolute top-3 right-3 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 touch-feedback"
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
                  </div>
                </Card>
              ))}

              {/* Load More Trigger */}
              <div ref={loadMoreRef} className="py-4">
                {isLoading && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{t('common.loading')}</span>
                  </div>
                )}
                {!hasMore && apiNotifications.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    {t('notifications.noMoreNotifications')}
                  </p>
                )}
              </div>

              {/* Total count */}
              {total > 0 && (
                <p className="text-center text-xs text-muted-foreground pb-4">
                  {t('notifications.totalCount', { count: total })}
                </p>
              )}
            </VStack>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
