// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Notification,
  NotificationsResult,
  MarketplaceReviewEventsResult,
} from '../../services/api/notifications';
import {
  isMarketplaceWsMessage,
  mergeNotificationsByLatest,
  splitIdsBySource,
  supportsMarketplaceReview,
  useNotifications,
} from '../../hooks/useNotifications';
import { useNotificationStore } from '../../stores/notificationStore';

const apiMocks = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  getMarketplaceReviewEvents: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markMarketplaceReviewEventAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  markAllMarketplaceReviewEventsAsRead: vi.fn(),
  batchNotifications: vi.fn(),
}));

const wsRegistry = vi.hoisted(() => ({
  messageHandlers: [] as Array<(message: { type: string; data?: unknown }) => void>,
  statusHandlers: [] as Array<(status: string) => void>,
}));

vi.mock('../../services/api/notifications', () => ({
  notificationsApi: apiMocks,
  getNotificationRoute: vi.fn(() => null),
}));

vi.mock('../../services/notification', () => ({
  notificationService: {
    init: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  },
  soundService: {
    updateVolume: vi.fn(),
    testPlay: vi.fn(),
  },
  getNotificationDisplayData: vi.fn(() => ({ title: '', message: '' })),
}));

vi.mock('../../services/websocket', () => ({
  onWebSocketMessage: vi.fn((handler: (message: { type: string; data?: unknown }) => void) => {
    wsRegistry.messageHandlers.push(handler);
    return () => {
      wsRegistry.messageHandlers = wsRegistry.messageHandlers.filter(item => item !== handler);
    };
  }),
  onWebSocketStatusChange: vi.fn((handler: (status: string) => void) => {
    wsRegistry.statusHandlers.push(handler);
    return () => {
      wsRegistry.statusHandlers = wsRegistry.statusHandlers.filter(item => item !== handler);
    };
  }),
}));

function makeNotification(
  input: Partial<Notification> & Pick<Notification, 'id' | 'source'>
): Notification {
  return {
    id: input.id,
    source: input.source,
    type: input.type || 'order.created',
    title: input.title || 'Test',
    message: input.message || 'Test message',
    read: input.read ?? false,
    timestamp: input.timestamp || new Date().toISOString(),
    data: input.data,
  };
}

function nodeResult(
  notifications: Notification[],
  options: Partial<NotificationsResult> = {}
): NotificationsResult {
  return {
    notifications,
    total: options.total ?? notifications.length,
    unread: options.unread ?? notifications.filter(item => !item.read).length,
    hasMore: options.hasMore ?? false,
    lastOffsetId: options.lastOffsetId,
  };
}

function marketplaceResult(
  notifications: Notification[],
  options: Partial<MarketplaceReviewEventsResult> = {}
): MarketplaceReviewEventsResult {
  return {
    notifications,
    total: options.total ?? notifications.length,
    unread: options.unread ?? notifications.filter(item => !item.read).length,
    hasMore: options.hasMore ?? false,
    nextBeforeID: options.nextBeforeID,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface HookHarnessProps {
  options?: Parameters<typeof useNotifications>[0];
  onUpdate: (value: ReturnType<typeof useNotifications>) => void;
}

function HookHarness({ options, onUpdate }: HookHarnessProps) {
  const value = useNotifications(options);
  useEffect(() => {
    onUpdate(value);
  }, [value, onUpdate]);
  return null;
}

function renderUseNotifications(options?: Parameters<typeof useNotifications>[0]) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let current: ReturnType<typeof useNotifications> | null = null;

  const onUpdate = (value: ReturnType<typeof useNotifications>) => {
    current = value;
  };

  act(() => {
    root.render(React.createElement(HookHarness, { options, onUpdate }));
  });

  return {
    get current() {
      if (!current) {
        throw new Error('Hook not initialized');
      }
      return current;
    },
    rerender(nextOptions?: Parameters<typeof useNotifications>[0]) {
      act(() => {
        root.render(React.createElement(HookHarness, { options: nextOptions, onUpdate }));
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useNotifications marketplace integration', () => {
  const hooksToCleanup: Array<{ unmount: () => void }> = [];
  const reactActEnv = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  let previousActEnvironment: boolean | undefined;

  beforeAll(() => {
    previousActEnvironment = reactActEnv.IS_REACT_ACT_ENVIRONMENT;
    reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    wsRegistry.messageHandlers = [];
    wsRegistry.statusHandlers = [];
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
    });
    apiMocks.getUnreadNotificationCount.mockResolvedValue(0);
    apiMocks.getNotifications.mockResolvedValue(nodeResult([]));
    apiMocks.getMarketplaceReviewEvents.mockResolvedValue(marketplaceResult([]));
    apiMocks.markNotificationAsRead.mockResolvedValue({ success: true });
    apiMocks.markMarketplaceReviewEventAsRead.mockResolvedValue({ success: true });
    apiMocks.markAllNotificationsAsRead.mockResolvedValue({ success: true });
    apiMocks.markAllMarketplaceReviewEventsAsRead.mockResolvedValue({ success: true });
    apiMocks.batchNotifications.mockResolvedValue({ success: true, count: 0 });
  });

  afterEach(() => {
    hooksToCleanup.splice(0).forEach(hook => hook.unmount());
    vi.useRealTimers();
  });

  afterAll(() => {
    if (typeof previousActEnvironment === 'undefined') {
      delete reactActEnv.IS_REACT_ACT_ENVIRONMENT;
      return;
    }
    reactActEnv.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it('includes marketplace review only for all/system filters', () => {
    expect(supportsMarketplaceReview('all')).toBe(true);
    expect(supportsMarketplaceReview('system')).toBe(true);
    expect(supportsMarketplaceReview('orders')).toBe(false);
    expect(supportsMarketplaceReview('followers')).toBe(false);
    expect(supportsMarketplaceReview('transactions')).toBe(false);
  });

  it('merges, dedupes and sorts notifications by latest timestamp', () => {
    const node = [
      makeNotification({ id: '1', source: 'node', timestamp: '2026-01-01T10:00:00.000Z' }),
      makeNotification({ id: '2', source: 'node', timestamp: '2026-01-01T08:00:00.000Z' }),
    ];
    const marketplace = [
      makeNotification({
        id: 'm1',
        source: 'marketplace-review',
        timestamp: '2026-01-01T09:00:00.000Z',
      }),
      makeNotification({
        id: 'm1',
        source: 'marketplace-review',
        timestamp: '2026-01-01T09:00:00.000Z',
        read: true,
      }),
    ];

    const merged = mergeNotificationsByLatest(node, marketplace, true);
    expect(merged.map(item => `${item.source}:${item.id}`)).toEqual([
      'node:1',
      'marketplace-review:m1',
      'node:2',
    ]);
    expect(merged[1].read).toBe(true);
  });

  it('splits ids by source for source-aware actions', () => {
    const notifications = [
      makeNotification({ id: '1', source: 'node' }),
      makeNotification({ id: 'm1', source: 'marketplace-review' }),
    ];
    const grouped = splitIdsBySource(['1', 'm1'], notifications);
    expect(grouped.node).toEqual(['1']);
    expect(grouped['marketplace-review']).toEqual(['m1']);
  });

  it('detects marketplace review websocket message', () => {
    expect(
      isMarketplaceWsMessage({
        type: 'marketplace_seller_review',
        data: { unread: 3 },
      })
    ).toBe(true);
    expect(
      isMarketplaceWsMessage({
        type: 'notification',
        data: {},
      })
    ).toBe(false);
  });

  it('keeps exhausted source pinned while other source continues pagination', async () => {
    const nodeFirst = makeNotification({
      id: 'node-1',
      source: 'node',
      timestamp: '2026-01-01T10:00:00.000Z',
    });
    const marketFirst = makeNotification({
      id: 'market-1',
      source: 'marketplace-review',
      type: 'marketplace.seller_review',
      timestamp: '2026-01-01T11:00:00.000Z',
      data: {
        marketplaceReview: {
          eventID: 11,
          marketplaceID: 'mkt-1',
          marketplaceStoreID: 1,
          peerID: 'QmPeer',
          actorID: 'QmActor',
          previousStatus: 'pending',
          status: 'approved',
        },
      },
    });
    const marketSecond = makeNotification({
      id: 'market-2',
      source: 'marketplace-review',
      type: 'marketplace.seller_review',
      timestamp: '2026-01-01T09:00:00.000Z',
      data: {
        marketplaceReview: {
          eventID: 10,
          marketplaceID: 'mkt-1',
          marketplaceStoreID: 1,
          peerID: 'QmPeer',
          actorID: 'QmActor',
          previousStatus: 'pending',
          status: 'suspended',
        },
      },
    });

    apiMocks.getNotifications.mockResolvedValueOnce(
      nodeResult([nodeFirst], { total: 1, unread: 1, hasMore: false, lastOffsetId: 'node-1' })
    );
    apiMocks.getMarketplaceReviewEvents
      .mockResolvedValueOnce(
        marketplaceResult([marketFirst], { total: 2, unread: 2, hasMore: true, nextBeforeID: 99 })
      )
      .mockResolvedValueOnce(
        marketplaceResult([marketSecond], { total: 2, unread: 2, hasMore: false, nextBeforeID: 98 })
      )
      .mockResolvedValueOnce(
        marketplaceResult([marketFirst], { total: 2, unread: 2, hasMore: true, nextBeforeID: 99 })
      );

    const hook = renderUseNotifications({ autoLoad: false, enableRealtime: false, pageSize: 20 });
    hooksToCleanup.push(hook);

    await act(async () => {
      await hook.current.fetchNotifications(true);
    });

    await act(async () => {
      await hook.current.loadMore();
    });

    expect(apiMocks.getNotifications).toHaveBeenCalledTimes(1);
    expect(apiMocks.getMarketplaceReviewEvents).toHaveBeenCalledTimes(2);
    expect(apiMocks.getMarketplaceReviewEvents).toHaveBeenNthCalledWith(2, {
      limit: 20,
      beforeID: 99,
    });
    expect(hook.current.apiNotifications.map(item => item.id)).toEqual([
      'market-1',
      'node-1',
      'market-2',
    ]);

    await act(async () => {
      await hook.current.fetchNotifications(true);
    });

    expect(apiMocks.getNotifications).toHaveBeenCalledTimes(2);
    expect(apiMocks.getNotifications).toHaveBeenLastCalledWith({
      limit: 20,
      offsetId: '',
      filter: 'all',
    });
    expect(apiMocks.getMarketplaceReviewEvents).toHaveBeenCalledTimes(3);
    expect(apiMocks.getMarketplaceReviewEvents).toHaveBeenLastCalledWith({
      limit: 20,
      beforeID: undefined,
    });
  });

  it('applies one coalesced network result to multiple hook instances', async () => {
    const nodeDeferred = deferred<NotificationsResult>();
    const marketplaceDeferred = deferred<MarketplaceReviewEventsResult>();

    apiMocks.getNotifications.mockReturnValue(nodeDeferred.promise);
    apiMocks.getMarketplaceReviewEvents.mockReturnValue(marketplaceDeferred.promise);

    const first = renderUseNotifications({ autoLoad: false, enableRealtime: false });
    const second = renderUseNotifications({ autoLoad: false, enableRealtime: false });
    hooksToCleanup.push(first, second);

    let firstPromise: Promise<unknown> = Promise.resolve();
    let secondPromise: Promise<unknown> = Promise.resolve();
    await act(async () => {
      firstPromise = first.current.fetchNotifications(true);
      secondPromise = second.current.fetchNotifications(true);
      await Promise.resolve();
    });

    expect(apiMocks.getNotifications).toHaveBeenCalledTimes(1);
    expect(apiMocks.getMarketplaceReviewEvents).toHaveBeenCalledTimes(1);

    await act(async () => {
      nodeDeferred.resolve(
        nodeResult([makeNotification({ id: 'node-1', source: 'node' })], {
          total: 1,
          unread: 1,
          hasMore: false,
          lastOffsetId: 'node-1',
        })
      );
      marketplaceDeferred.resolve(
        marketplaceResult([], {
          total: 0,
          unread: 0,
          hasMore: false,
        })
      );
      await Promise.all([firstPromise, secondPromise]);
    });

    await flushMicrotasks();
    expect(first.current.apiNotifications).toHaveLength(1);
    expect(second.current.apiNotifications).toHaveLength(1);
  });

  it('autoLoad=false only initializes realtime/unread and does not fetch list on mount', async () => {
    apiMocks.getMarketplaceReviewEvents.mockResolvedValue(
      marketplaceResult([], { total: 0, unread: 3, hasMore: false })
    );
    apiMocks.getUnreadNotificationCount.mockResolvedValue(2);

    const hook = renderUseNotifications({ autoLoad: false, enableRealtime: true });
    hooksToCleanup.push(hook);

    await flushMicrotasks();
    expect(apiMocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
    expect(apiMocks.getNotifications).not.toHaveBeenCalled();
    expect(apiMocks.getMarketplaceReviewEvents).toHaveBeenCalledWith({ limit: 1 });
  });

  it('retains marketplace unread badge when loading non-marketplace filter list', async () => {
    const orderNode = makeNotification({
      id: 'node-order-1',
      source: 'node',
      type: 'order.created',
      read: false,
    });
    apiMocks.getUnreadNotificationCount.mockResolvedValue(2);
    apiMocks.getMarketplaceReviewEvents.mockResolvedValueOnce(
      marketplaceResult([], { total: 0, unread: 5, hasMore: false })
    );
    apiMocks.getNotifications.mockResolvedValueOnce(
      nodeResult([orderNode], { total: 1, unread: 1, hasMore: false, lastOffsetId: 'node-order-1' })
    );

    const hook = renderUseNotifications({ autoLoad: false, enableRealtime: false, pageSize: 20 });
    hooksToCleanup.push(hook);

    await act(async () => {
      await hook.current.fetchUnreadCount();
    });
    expect(hook.current.unreadCount).toBe(7);

    act(() => {
      hook.current.setFilter('orders');
    });
    await act(async () => {
      await hook.current.fetchNotifications(true);
    });

    expect(apiMocks.getNotifications).toHaveBeenCalledWith({
      limit: 20,
      offsetId: '',
      filter: 'orders',
    });
    expect(hook.current.apiNotifications.every(item => item.source === 'node')).toBe(true);
    expect(hook.current.total).toBe(1);
    expect(hook.current.unreadCount).toBe(6);
  });

  it('uses source-aware mark-one and marketplace-only delete guard', async () => {
    const node = makeNotification({ id: 'node-1', source: 'node', read: false });
    const marketplace = makeNotification({
      id: 'market-1',
      source: 'marketplace-review',
      type: 'marketplace.seller_review',
      read: false,
      data: {
        marketplaceReview: {
          eventID: 101,
          marketplaceID: 'mkt-1',
          marketplaceStoreID: 1,
          peerID: 'QmPeer',
          actorID: 'QmActor',
          previousStatus: 'pending',
          status: 'rejected',
          reason: 'Missing docs',
        },
      },
    });
    apiMocks.getNotifications.mockResolvedValue(
      nodeResult([node], { total: 1, unread: 1, hasMore: false })
    );
    apiMocks.getMarketplaceReviewEvents.mockResolvedValue(
      marketplaceResult([marketplace], { total: 1, unread: 1, hasMore: false })
    );
    apiMocks.batchNotifications.mockResolvedValue({ success: true, count: 1 });

    const hook = renderUseNotifications({ autoLoad: false, enableRealtime: false, pageSize: 20 });
    hooksToCleanup.push(hook);

    await act(async () => {
      await hook.current.fetchNotifications(true);
    });

    await act(async () => {
      await hook.current.markAsRead('market-1');
    });

    expect(apiMocks.markMarketplaceReviewEventAsRead).toHaveBeenCalledWith('mkt-1', 101);
    expect(apiMocks.markNotificationAsRead).not.toHaveBeenCalled();

    let deleteMarketOnly: { success: boolean; error?: string } | undefined;
    await act(async () => {
      deleteMarketOnly = await hook.current.deleteNotifications(['market-1']);
    });
    expect(deleteMarketOnly?.success).toBe(false);
    expect(apiMocks.batchNotifications).not.toHaveBeenCalled();

    let deleteMixed: { success: boolean; error?: string } | undefined;
    await act(async () => {
      deleteMixed = await hook.current.deleteNotifications(['node-1', 'market-1']);
    });
    expect(apiMocks.batchNotifications).toHaveBeenCalledWith('delete', ['node-1']);
    expect(deleteMixed?.success).toBe(false);
  });

  it('always calls both mark-all endpoints and reports partial failure', async () => {
    apiMocks.markAllNotificationsAsRead.mockResolvedValue({ success: true });
    apiMocks.markAllMarketplaceReviewEventsAsRead.mockResolvedValue({ success: false });

    const hook = renderUseNotifications({ autoLoad: false, enableRealtime: false, pageSize: 20 });
    hooksToCleanup.push(hook);

    let markAllResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      markAllResult = await hook.current.markAllAsRead();
    });

    expect(apiMocks.markAllNotificationsAsRead).toHaveBeenCalledTimes(1);
    expect(apiMocks.markAllMarketplaceReviewEventsAsRead).toHaveBeenCalledTimes(1);
    expect(markAllResult?.success).toBe(false);
    expect(markAllResult?.error).toBeTruthy();
  });

  it('propagates mark-one reconcile to another mounted hook instance', async () => {
    vi.useFakeTimers();
    const node = makeNotification({ id: 'node-1', source: 'node', read: false });
    apiMocks.getNotifications.mockResolvedValue(
      nodeResult([node], { total: 1, unread: 1, hasMore: false })
    );
    apiMocks.getMarketplaceReviewEvents.mockResolvedValue(
      marketplaceResult([], { total: 0, unread: 0 })
    );
    apiMocks.markNotificationAsRead.mockResolvedValue({ success: true });

    const first = renderUseNotifications({ autoLoad: false, enableRealtime: false });
    const second = renderUseNotifications({ autoLoad: false, enableRealtime: false });
    hooksToCleanup.push(first, second);

    await act(async () => {
      await Promise.all([
        first.current.fetchNotifications(true),
        second.current.fetchNotifications(true),
      ]);
    });

    const beforeCalls = apiMocks.getNotifications.mock.calls.length;
    await act(async () => {
      await first.current.markAsRead('node-1');
      vi.advanceTimersByTime(160);
    });

    await flushMicrotasks();
    expect(apiMocks.getNotifications.mock.calls.length).toBeGreaterThan(beforeCalls);
  });

  it('clearNotifications clears apiNotifications and unread count', async () => {
    const node = makeNotification({ id: 'node-1', source: 'node', read: false });
    apiMocks.getNotifications.mockResolvedValue(
      nodeResult([node], { total: 1, unread: 1, hasMore: false })
    );
    apiMocks.getMarketplaceReviewEvents.mockResolvedValue(
      marketplaceResult([], { total: 0, unread: 0 })
    );

    const hook = renderUseNotifications({ autoLoad: false, enableRealtime: false, pageSize: 20 });
    hooksToCleanup.push(hook);
    await act(async () => {
      await hook.current.fetchNotifications(true);
    });
    expect(hook.current.apiNotifications).toHaveLength(1);

    act(() => {
      hook.current.clearNotifications();
    });

    expect(hook.current.apiNotifications).toHaveLength(0);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('debounces websocket-triggered reconcile for loaded list', async () => {
    vi.useFakeTimers();
    const node = makeNotification({ id: 'node-1', source: 'node' });

    apiMocks.getNotifications.mockResolvedValue(
      nodeResult([node], { total: 1, unread: 1, hasMore: false })
    );
    apiMocks.getMarketplaceReviewEvents.mockResolvedValue(
      marketplaceResult([], { total: 0, unread: 0, hasMore: false })
    );

    const hook = renderUseNotifications({ autoLoad: false, enableRealtime: true, pageSize: 20 });
    hooksToCleanup.push(hook);

    await act(async () => {
      await hook.current.fetchNotifications(true);
    });
    expect(apiMocks.getNotifications).toHaveBeenCalledTimes(1);

    const handler = wsRegistry.messageHandlers[0];
    expect(handler).toBeTypeOf('function');

    await act(async () => {
      handler({ type: 'marketplace_seller_review', data: { unread: 4 } });
      handler({ type: 'marketplace_seller_review', data: { unread: 5 } });
      vi.advanceTimersByTime(300);
    });

    await flushMicrotasks();
    expect(apiMocks.getNotifications).toHaveBeenCalledTimes(2);
  });
});
