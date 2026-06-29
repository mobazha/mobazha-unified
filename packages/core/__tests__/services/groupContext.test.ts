import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api/client', () => ({
  post: vi.fn(),
}));

vi.mock('../../services/api/config', () => ({
  getHostingUrl: vi.fn(() => 'https://hosting.test'),
  getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
}));

import { post } from '../../services/api/client';
import { HOSTING_API } from '../../config/apiPaths';
import {
  clearGroupContext,
  detectGroupContext,
  initializeGroupMarketplace,
  saveGroupContext,
  verifyGroupMembership,
} from '../../services/groupContext';

const mockPost = post as ReturnType<typeof vi.fn>;

describe('groupContext service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete (window as unknown as { Telegram?: unknown }).Telegram;
  });

  afterEach(() => {
    clearGroupContext();
    delete (window as unknown as { Telegram?: unknown }).Telegram;
  });

  describe('detectGroupContext', () => {
    it('captures platformUserId from Telegram WebApp user for start_param entry', async () => {
      (window as unknown as { Telegram: { WebApp: unknown } }).Telegram = {
        WebApp: {
          initDataUnsafe: {
            start_param: 'group_-100123',
            user: { id: 424242, first_name: 'Test' },
          },
        },
      };

      const context = await detectGroupContext();

      expect(context).toEqual({
        platform: 'telegram',
        chatId: '-100123',
        platformUserId: '424242',
        needsVerification: true,
      });
    });

    it('keeps direct Telegram WebApp chat context without verification', async () => {
      (window as unknown as { Telegram: { WebApp: unknown } }).Telegram = {
        WebApp: {
          initDataUnsafe: {
            chat: {
              id: -100999,
              type: 'supergroup',
              title: 'Collectibles',
              username: 'collectibles_chat',
            },
            user: { id: 777, first_name: 'Member' },
          },
        },
      };

      const context = await detectGroupContext();

      expect(context).toMatchObject({
        platform: 'telegram',
        chatId: '-100999',
        chatType: 'supergroup',
        chatTitle: 'Collectibles',
        chatUsername: 'collectibles_chat',
        platformUserId: '777',
        needsVerification: false,
      });
    });
  });

  describe('verifyGroupMembership', () => {
    it('fails closed when platform user ID is unavailable', async () => {
      const result = await verifyGroupMembership('telegram', '-100123');

      expect(result).toEqual({ verified: false });
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('sends telegramUserId and parses unwrapped verify response', async () => {
      mockPost.mockResolvedValueOnce({
        isMember: true,
        group: { chatTitle: 'Verified Group', marketplaceID: 'mp-1' },
      });

      const result = await verifyGroupMembership('telegram', '-100123', '424242');

      expect(mockPost).toHaveBeenCalledWith(
        `https://hosting.test${HOSTING_API.COMMUNITY_MARKETPLACES_TELEGRAM_VERIFY_MEMBER('-100123')}`,
        { telegramUserId: '424242' },
        expect.objectContaining({ 'Content-Type': 'application/json' })
      );
      expect(result).toEqual({
        verified: true,
        chatTitle: 'Verified Group',
        marketplaceID: 'mp-1',
      });
    });

    it('sends discordUserId for discord platform', async () => {
      mockPost.mockResolvedValueOnce({ isValid: true });

      await verifyGroupMembership('discord', 'guild-1', 'discord-user-9');

      expect(mockPost).toHaveBeenCalledWith(
        `https://hosting.test${HOSTING_API.COMMUNITY_MARKETPLACES_DISCORD_VERIFY_MEMBER('guild-1')}`,
        { discordUserId: 'discord-user-9' },
        expect.any(Object)
      );
    });

    it('does not use stale saved platformUserId when explicit ID is omitted', async () => {
      await saveGroupContext({
        platform: 'telegram',
        chatId: '-100123',
        platformUserId: 'stale-user',
        needsVerification: true,
      });

      const result = await verifyGroupMembership('telegram', '-100456');

      expect(result).toEqual({ verified: false });
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('initializeGroupMarketplace', () => {
    it('fails closed when verification is required but platform user ID is missing', async () => {
      (window as unknown as { Telegram: { WebApp: unknown } }).Telegram = {
        WebApp: {
          initDataUnsafe: {
            start_param: 'group_-100123',
          },
        },
      };

      const result = await initializeGroupMarketplace();

      expect(result).toBeNull();
      expect(mockPost).not.toHaveBeenCalled();
      expect(localStorage.getItem('current_group_context')).toBeNull();
    });

    it('does not verify newly detected context with stale saved platformUserId', async () => {
      await saveGroupContext({
        platform: 'telegram',
        chatId: '-100999',
        platformUserId: 'stale-user',
        needsVerification: false,
      });

      (window as unknown as { Telegram: { WebApp: unknown } }).Telegram = {
        WebApp: {
          initDataUnsafe: {
            start_param: 'group_-100123',
          },
        },
      };

      const result = await initializeGroupMarketplace();

      expect(result).toBeNull();
      expect(mockPost).not.toHaveBeenCalled();
      expect(localStorage.getItem('current_group_context')).toBeNull();
    });

    it('registers marketplace after successful verification', async () => {
      (window as unknown as { Telegram: { WebApp: unknown } }).Telegram = {
        WebApp: {
          initDataUnsafe: {
            start_param: 'group_-100123',
            user: { id: 424242, first_name: 'Test' },
          },
        },
      };

      mockPost
        .mockResolvedValueOnce({
          isMember: true,
          group: { chatTitle: 'Verified Group' },
        })
        .mockResolvedValueOnce({ id: 'mp-registered' });

      const result = await initializeGroupMarketplace();

      expect(result).toMatchObject({
        platform: 'telegram',
        chatId: '-100123',
        platformUserId: '424242',
        chatTitle: 'Verified Group',
        marketplaceID: 'mp-registered',
        needsVerification: false,
      });
      expect(mockPost).toHaveBeenNthCalledWith(
        1,
        `https://hosting.test${HOSTING_API.COMMUNITY_MARKETPLACES_TELEGRAM_VERIFY_MEMBER('-100123')}`,
        { telegramUserId: '424242' },
        expect.any(Object)
      );
      expect(mockPost).toHaveBeenNthCalledWith(
        2,
        `https://hosting.test${HOSTING_API.COMMUNITY_MARKETPLACES_BY_PLATFORM('telegram')}`,
        {
          chatID: '-100123',
          chatType: '',
          chatTitle: 'Verified Group',
          chatUsername: '',
        },
        expect.any(Object)
      );
    });
  });
});
