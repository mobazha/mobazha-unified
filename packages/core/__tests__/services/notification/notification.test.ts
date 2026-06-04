/**
 * 通知服务测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  OrderNotificationData,
  DisputeNotificationData,
  SocialNotificationData,
  SoundNotificationType,
} from '../../../types/notification';
import {
  getNotificationCategory,
  isOrderNotification,
  isDisputeNotification,
  isSocialNotification,
  eventTypeToSoundType,
  isValidNotificationEventType,
  normalizeNotificationType,
  ORDER_NOTIFICATION_TYPES,
  DISPUTE_NOTIFICATION_TYPES,
  SOCIAL_NOTIFICATION_TYPES,
  SOUND_CONFIGS,
} from '../../../types/notification';

describe('Notification Types', () => {
  describe('getNotificationCategory', () => {
    it('should return "order" for order notification types', () => {
      ORDER_NOTIFICATION_TYPES.forEach(type => {
        expect(getNotificationCategory(type)).toBe('order');
      });
    });

    it('should return "dispute" for dispute notification types', () => {
      DISPUTE_NOTIFICATION_TYPES.forEach(type => {
        expect(getNotificationCategory(type)).toBe('dispute');
      });
    });

    it('should return "social" for social notification types', () => {
      SOCIAL_NOTIFICATION_TYPES.forEach(type => {
        expect(getNotificationCategory(type)).toBe('social');
      });
    });
  });

  describe('Type Guards', () => {
    const orderNotification: OrderNotificationData = {
      id: '1',
      type: 'order.created',
      timestamp: new Date().toISOString(),
      read: false,
      orderID: 'order-123',
      buyerID: 'buyer-123',
    };

    const disputeNotification: DisputeNotificationData = {
      id: '2',
      type: 'dispute.opened',
      timestamp: new Date().toISOString(),
      read: false,
      caseID: 'case-123',
    };

    const socialNotification: SocialNotificationData = {
      id: '3',
      type: 'social.follow',
      timestamp: new Date().toISOString(),
      read: false,
      peerID: 'peer-123',
    };

    it('isOrderNotification should correctly identify order notifications', () => {
      expect(isOrderNotification(orderNotification)).toBe(true);
      expect(isOrderNotification(disputeNotification)).toBe(false);
      expect(isOrderNotification(socialNotification)).toBe(false);
    });

    it('isDisputeNotification should correctly identify dispute notifications', () => {
      expect(isDisputeNotification(disputeNotification)).toBe(true);
      expect(isDisputeNotification(orderNotification)).toBe(false);
      expect(isDisputeNotification(socialNotification)).toBe(false);
    });

    it('isSocialNotification should correctly identify social notifications', () => {
      expect(isSocialNotification(socialNotification)).toBe(true);
      expect(isSocialNotification(orderNotification)).toBe(false);
      expect(isSocialNotification(disputeNotification)).toBe(false);
    });
  });

  describe('eventTypeToSoundType', () => {
    it('should map order.created to new_order', () => {
      expect(eventTypeToSoundType('order.created')).toBe('new_order');
    });

    it('should map payment events to payment', () => {
      expect(eventTypeToSoundType('order.payment_received')).toBe('payment');
      expect(eventTypeToSoundType('order.funded')).toBe('payment');
    });

    it('should map dispute events to dispute', () => {
      expect(eventTypeToSoundType('dispute.opened')).toBe('dispute');
      expect(eventTypeToSoundType('dispute.case_open')).toBe('dispute');
      expect(eventTypeToSoundType('order.refunded')).toBe('dispute');
    });

    it('should map completion events to order_complete', () => {
      expect(eventTypeToSoundType('order.completed')).toBe('order_complete');
      expect(eventTypeToSoundType('order.shipped')).toBe('order_complete');
    });

    it('should map social events to chat_message (default)', () => {
      expect(eventTypeToSoundType('social.follow')).toBe('chat_message');
      expect(eventTypeToSoundType('social.unfollow')).toBe('chat_message');
    });
  });

  describe('isValidNotificationEventType', () => {
    it('should return true for valid order event types', () => {
      expect(isValidNotificationEventType('order.created')).toBe(true);
      expect(isValidNotificationEventType('order.payment_received')).toBe(true);
      expect(isValidNotificationEventType('order.shipped')).toBe(true);
    });

    it('should return true for valid dispute event types', () => {
      expect(isValidNotificationEventType('dispute.opened')).toBe(true);
      expect(isValidNotificationEventType('dispute.case_open')).toBe(true);
    });

    it('should return true for valid social event types', () => {
      expect(isValidNotificationEventType('social.follow')).toBe(true);
      expect(isValidNotificationEventType('social.unfollow')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isValidNotificationEventType('invalid')).toBe(false);
      expect(isValidNotificationEventType('')).toBe(false);
      expect(isValidNotificationEventType('newOrder')).toBe(false);
    });
  });

  describe('normalizeNotificationType', () => {
    it('should pass through valid event types unchanged', () => {
      expect(normalizeNotificationType('order.created')).toBe('order.created');
      expect(normalizeNotificationType('order.payment_received')).toBe('order.payment_received');
      expect(normalizeNotificationType('dispute.opened')).toBe('dispute.opened');
      expect(normalizeNotificationType('social.follow')).toBe('social.follow');
    });

    it('should return social.follow for unknown types', () => {
      expect(normalizeNotificationType('unknown')).toBe('social.follow');
      expect(normalizeNotificationType('')).toBe('social.follow');
    });
  });

  describe('SOUND_CONFIGS', () => {
    it('should have configuration for all sound types', () => {
      const soundTypes: SoundNotificationType[] = [
        'chat_message',
        'order_chat',
        'new_order',
        'payment',
        'dispute',
        'order_complete',
      ];

      soundTypes.forEach(type => {
        expect(SOUND_CONFIGS[type]).toBeDefined();
        expect(SOUND_CONFIGS[type].soundFile).toBeTruthy();
        expect(SOUND_CONFIGS[type].priority).toMatch(/^(normal|high|urgent)$/);
        expect(SOUND_CONFIGS[type].cooldown).toBeGreaterThan(0);
      });
    });

    it('should have correct priority levels', () => {
      expect(SOUND_CONFIGS.chat_message.priority).toBe('normal');
      expect(SOUND_CONFIGS.order_chat.priority).toBe('high');
      expect(SOUND_CONFIGS.new_order.priority).toBe('high');
      expect(SOUND_CONFIGS.payment.priority).toBe('high');
      expect(SOUND_CONFIGS.dispute.priority).toBe('urgent');
      expect(SOUND_CONFIGS.order_complete.priority).toBe('normal');
    });

    it('should have decreasing cooldowns for higher priority', () => {
      expect(SOUND_CONFIGS.dispute.cooldown).toBeLessThan(SOUND_CONFIGS.new_order.cooldown);
      expect(SOUND_CONFIGS.new_order.cooldown).toBeLessThan(SOUND_CONFIGS.chat_message.cooldown);
    });
  });
});

describe('Notification Store', () => {
  // 动态导入以避免 Zustand 模块初始化时序问题
  let useNotificationStore: typeof import('../../../stores/notificationStore').useNotificationStore;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../stores/notificationStore');
    useNotificationStore = module.useNotificationStore;

    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      soundEnabled: true,
      ttsEnabled: false,
      volume: 0.5,
      currentRoomId: null,
      currentPage: null,
    });
  });

  it('should preserve unread count when replacing notification list', () => {
    const store = useNotificationStore.getState();
    store.setUnreadCount(16);
    store.setNotifications([
      {
        id: 'test-1',
        type: 'order.created',
        timestamp: new Date().toISOString(),
        read: false,
        orderID: 'order-123',
      } as OrderNotificationData,
    ]);

    expect(useNotificationStore.getState().unreadCount).toBe(16);
  });

  it('should add notification correctly', () => {
    const store = useNotificationStore.getState();
    const notification: OrderNotificationData = {
      id: 'test-1',
      type: 'order.created',
      timestamp: new Date().toISOString(),
      read: false,
      orderID: 'order-123',
    };

    store.addNotification(notification);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].id).toBe('test-1');
    expect(state.unreadCount).toBe(1);
  });

  it('should not add duplicate notifications', () => {
    const store = useNotificationStore.getState();
    const notification: OrderNotificationData = {
      id: 'test-1',
      type: 'order.created',
      timestamp: new Date().toISOString(),
      read: false,
      orderID: 'order-123',
    };

    store.addNotification(notification);
    store.addNotification(notification);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
  });

  it('should mark notification as read', () => {
    const store = useNotificationStore.getState();
    const notification: OrderNotificationData = {
      id: 'test-1',
      type: 'order.created',
      timestamp: new Date().toISOString(),
      read: false,
      orderID: 'order-123',
    };

    store.addNotification(notification);
    expect(useNotificationStore.getState().unreadCount).toBe(1);

    store.markAsRead('test-1');

    const state = useNotificationStore.getState();
    expect(state.notifications[0].read).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it('should mark all notifications as read', () => {
    const store = useNotificationStore.getState();

    store.addNotification({
      id: 'test-1',
      type: 'order.created',
      timestamp: new Date().toISOString(),
      read: false,
      orderID: 'order-1',
    } as OrderNotificationData);

    store.addNotification({
      id: 'test-2',
      type: 'social.follow',
      timestamp: new Date().toISOString(),
      read: false,
      peerID: 'peer-1',
    } as SocialNotificationData);

    expect(useNotificationStore.getState().unreadCount).toBe(2);

    store.markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every(n => n.read)).toBe(true);
  });

  it('should remove notification', () => {
    const store = useNotificationStore.getState();
    const notification: OrderNotificationData = {
      id: 'test-1',
      type: 'order.created',
      timestamp: new Date().toISOString(),
      read: false,
      orderID: 'order-123',
    };

    store.addNotification(notification);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);

    store.removeNotification('test-1');

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
  });

  it('should update sound settings', () => {
    const store = useNotificationStore.getState();

    store.setSoundEnabled(false);
    expect(useNotificationStore.getState().soundEnabled).toBe(false);

    store.setTtsEnabled(true);
    expect(useNotificationStore.getState().ttsEnabled).toBe(true);

    store.setVolume(0.8);
    expect(useNotificationStore.getState().volume).toBe(0.8);
  });

  it('should clamp volume between 0 and 1', () => {
    const store = useNotificationStore.getState();

    store.setVolume(1.5);
    expect(useNotificationStore.getState().volume).toBe(1);

    store.setVolume(-0.5);
    expect(useNotificationStore.getState().volume).toBe(0);
  });

  it('should filter notifications by category', () => {
    const store = useNotificationStore.getState();

    store.addNotification({
      id: 'order-1',
      type: 'order.created',
      timestamp: new Date().toISOString(),
      read: false,
      orderID: 'order-1',
    } as OrderNotificationData);

    store.addNotification({
      id: 'dispute-1',
      type: 'dispute.opened',
      timestamp: new Date().toISOString(),
      read: false,
      caseID: 'case-1',
    } as DisputeNotificationData);

    store.addNotification({
      id: 'follow-1',
      type: 'social.follow',
      timestamp: new Date().toISOString(),
      read: false,
      peerID: 'peer-1',
    } as SocialNotificationData);

    const state = useNotificationStore.getState();

    expect(state.getOrderNotifications()).toHaveLength(1);
    expect(state.getDisputeNotifications()).toHaveLength(1);
    expect(state.getSocialNotifications()).toHaveLength(1);
  });
});
