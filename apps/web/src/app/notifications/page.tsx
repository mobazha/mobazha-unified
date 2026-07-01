'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import {
  useChatStore,
  useNotifications,
  useI18n,
  getNotificationRoute,
  groupNotificationsForDisplay,
  getDisplayItemsNotificationIds,
} from '@mobazha/core';
import type { NotificationFilter, Notification } from '@mobazha/core';
import {
  NotificationCard,
  OrderNotificationCard,
  FollowNotificationCard,
  DisputeNotificationCard,
  AggregatedOrderNotificationCard,
} from '@/components/Notification';
import { Bell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ 分类标签配置 ============

interface TabConfig {
  key: NotificationFilter;
  labelKey: string;
}

const ALL_TABS: TabConfig[] = [
  { key: 'all', labelKey: 'notifications.tabAll' },
  { key: 'orders', labelKey: 'notifications.tabOrders' },
  { key: 'transactions', labelKey: 'notifications.tabTransactions' },
  { key: 'system', labelKey: 'notifications.tabSystem' },
  { key: 'followers', labelKey: 'notifications.tabFollowers' },
];

const SOVEREIGN_TABS: TabConfig[] = [
  { key: 'all', labelKey: 'notifications.tabAll' },
  { key: 'orders', labelKey: 'notifications.tabOrders' },
];

const TABS = typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__ ? SOVEREIGN_TABS : ALL_TABS;

// ============ 主组件 ============

export default function NotificationsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const {
    apiNotifications,
    unreadCount,
    isLoading,
    hasMore,
    currentFilter,
    total,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
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
    const result = await markAllAsRead();
    if (result.success) {
      toast({ title: t('notifications.allMarkedRead') });
      return;
    }
    toast({
      title: t('common.error'),
      description: result.error ?? t('notifications.markAllReadFailed'),
      variant: 'destructive',
    });
  }, [markAllAsRead, t]);

  const handleMarkGroupAsRead = useCallback(
    (items: Notification[]) => {
      items
        .filter(n => !n.read)
        .forEach(n => {
          void handleMarkAsRead(n.id);
        });
    },
    [handleMarkAsRead]
  );

  // 处理删除通知
  const handleDeleteDisplayItem = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      const result = await deleteNotifications(ids);
      if (result.success) {
        toast({ title: t('notifications.notificationDeleted') });
        return;
      }

      toast({
        title: t('common.error'),
        description: result.error ?? t('notifications.deleteFailed'),
        variant: 'destructive',
      });
    },
    [deleteNotifications, t]
  );

  const displayItems = useMemo(
    () => groupNotificationsForDisplay(apiNotifications),
    [apiNotifications]
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
          />
        );
      }

      return (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onClick={() => handleNotificationClick(notification)}
        />
      );
    },
    [handleNotificationClick]
  );

  const renderDisplayItem = useCallback(
    (item: ReturnType<typeof groupNotificationsForDisplay>[number]) => {
      if (item.kind === 'order-group') {
        const route = getNotificationRoute(item.latest);
        return (
          <AggregatedOrderNotificationCard
            orderID={item.orderID}
            items={item.items}
            latest={item.latest}
            hasUnread={item.hasUnread}
            route={route}
            onClick={() => {
              handleMarkGroupAsRead(item.items);
              if (item.latest.type === 'chat.message') {
                openChatDrawer();
              }
            }}
          />
        );
      }

      return renderNotificationCard(item.notification);
    },
    [handleMarkGroupAsRead, openChatDrawer, renderNotificationCard]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('notifications.title')} onBack={() => router.push('/me')} />

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
                    'px-4 py-2.5 min-h-[44px] rounded-md text-xs sm:text-sm font-medium transition-colors touch-feedback',
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
                    : currentFilter === 'transactions'
                      ? t('notifications.noTransactionNotifications')
                      : currentFilter === 'system'
                        ? t('notifications.noSystemNotifications')
                        : t('notifications.noNotifications')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('notifications.newNotificationsDesc')}
              </p>
            </Card>
          ) : (
            <VStack gap="xs">
              {displayItems.map(item => {
                const isUnread =
                  item.kind === 'order-group' ? item.hasUnread : !item.notification.read;
                const itemIds = getDisplayItemsNotificationIds(item);
                const canDelete =
                  item.kind === 'order-group' ? true : item.notification.source === 'node';

                return (
                  <Card
                    key={item.kind === 'order-group' ? item.id : item.notification.id}
                    className={cn(
                      'transition-all overflow-hidden',
                      isUnread && 'ring-1 ring-primary/20'
                    )}
                  >
                    <div className="relative group">
                      {renderDisplayItem(item)}
                      {canDelete && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            void handleDeleteDisplayItem(itemIds);
                          }}
                          aria-label={t('common.delete')}
                          className="absolute bottom-2 right-3 sm:top-3 sm:bottom-auto p-1.5 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] sm:p-2 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors opacity-0 active:opacity-100 sm:active:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
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
                      )}
                    </div>
                  </Card>
                );
              })}

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
