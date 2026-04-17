/**
 * useSalesChannels Hook
 *
 * Manages Store Links and Telegram Bot binding state.
 */

import { useState, useCallback, useEffect } from 'react';
import type { StoreLinkInfo, StoreBotInfo, BotWebhookStatus } from '../types/salesChannels';
import {
  getStoreLink,
  regenerateStoreLink,
  getStoreBot,
  bindStoreBot,
  unbindStoreBot,
  getBotWebhookStatus,
  repairBotWebhook,
  syncBotMenuButton,
} from '../services/api/salesChannels';

export interface UseSalesChannelsOptions {
  peerID?: string;
  autoLoad?: boolean;
}

export interface UseSalesChannelsReturn {
  storeLink: StoreLinkInfo | null;
  storeLinkLoading: boolean;

  storeBot: StoreBotInfo | null;
  storeBotLoading: boolean;
  storeBotNotFound: boolean;

  // MS2b.2 Wave 4 — 诊断 / 修复
  botWebhookStatus: BotWebhookStatus | null;
  botWebhookStatusLoading: boolean;
  botRepairLoading: boolean;
  botMenuButtonSyncLoading: boolean;

  error: string | null;

  loadStoreLink: () => Promise<void>;
  regenerateLink: () => Promise<StoreLinkInfo | null>;
  loadStoreBot: () => Promise<void>;
  bindBot: (botToken: string) => Promise<StoreBotInfo | null>;
  unbindBot: () => Promise<boolean>;

  loadBotWebhookStatus: () => Promise<BotWebhookStatus | null>;
  repairBot: () => Promise<StoreBotInfo | null>;
  syncMenuButton: () => Promise<StoreBotInfo | null>;
}

export function useSalesChannels(options: UseSalesChannelsOptions = {}): UseSalesChannelsReturn {
  const { peerID, autoLoad = false } = options;

  const [storeLink, setStoreLink] = useState<StoreLinkInfo | null>(null);
  const [storeLinkLoading, setStoreLinkLoading] = useState(false);

  const [storeBot, setStoreBot] = useState<StoreBotInfo | null>(null);
  const [storeBotLoading, setStoreBotLoading] = useState(false);
  const [storeBotNotFound, setStoreBotNotFound] = useState(false);

  const [botWebhookStatus, setBotWebhookStatus] = useState<BotWebhookStatus | null>(null);
  const [botWebhookStatusLoading, setBotWebhookStatusLoading] = useState(false);
  const [botRepairLoading, setBotRepairLoading] = useState(false);
  const [botMenuButtonSyncLoading, setBotMenuButtonSyncLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadStoreLinkFn = useCallback(async () => {
    setStoreLinkLoading(true);
    setError(null);
    try {
      const result = await getStoreLink();
      setStoreLink(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load store link';
      setError(message);
      console.error('[useSalesChannels] loadStoreLink error:', err);
    } finally {
      setStoreLinkLoading(false);
    }
  }, []);

  const regenerateLinkFn = useCallback(async (): Promise<StoreLinkInfo | null> => {
    setError(null);
    try {
      const result = await regenerateStoreLink();
      setStoreLink(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate link';
      setError(message);
      console.error('[useSalesChannels] regenerateLink error:', err);
      return null;
    }
  }, []);

  const loadStoreBotFn = useCallback(async () => {
    if (!peerID) return;
    setStoreBotLoading(true);
    setStoreBotNotFound(false);
    setError(null);
    try {
      const result = await getStoreBot(peerID);
      setStoreBot(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bot config';
      if (message.includes('not found') || message.includes('No bot configured')) {
        setStoreBotNotFound(true);
      } else {
        setError(message);
        console.error('[useSalesChannels] loadStoreBot error:', err);
      }
    } finally {
      setStoreBotLoading(false);
    }
  }, [peerID]);

  const bindBotFn = useCallback(
    async (botToken: string): Promise<StoreBotInfo | null> => {
      if (!peerID) return null;
      setError(null);
      try {
        const result = await bindStoreBot({ peerID, botToken });
        setStoreBot(result);
        setStoreBotNotFound(false);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to bind bot';
        setError(message);
        console.error('[useSalesChannels] bindBot error:', err);
        return null;
      }
    },
    [peerID]
  );

  const unbindBotFn = useCallback(async (): Promise<boolean> => {
    if (!peerID) return false;
    setError(null);
    try {
      await unbindStoreBot(peerID);
      setStoreBot(null);
      setStoreBotNotFound(true);
      setBotWebhookStatus(null);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unbind bot';
      setError(message);
      console.error('[useSalesChannels] unbindBot error:', err);
      return false;
    }
  }, [peerID]);

  const loadBotWebhookStatusFn = useCallback(async (): Promise<BotWebhookStatus | null> => {
    if (!peerID) return null;
    setBotWebhookStatusLoading(true);
    setError(null);
    try {
      const result = await getBotWebhookStatus(peerID);
      setBotWebhookStatus(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load webhook status';
      // 404 = bot 未绑定；不当作错误展示，交由 UI 根据 storeBot 状态判断。
      if (!message.includes('not found') && !message.includes('No bot configured')) {
        setError(message);
        console.error('[useSalesChannels] loadBotWebhookStatus error:', err);
      }
      return null;
    } finally {
      setBotWebhookStatusLoading(false);
    }
  }, [peerID]);

  const repairBotFn = useCallback(async (): Promise<StoreBotInfo | null> => {
    if (!peerID) return null;
    setBotRepairLoading(true);
    setError(null);
    try {
      const result = await repairBotWebhook(peerID);
      setStoreBot(result);
      // 修复后 Telegram 侧应对齐，立即刷新诊断面板。
      try {
        const status = await getBotWebhookStatus(peerID);
        setBotWebhookStatus(status);
      } catch (_refreshErr) {
        // 刷新失败不影响主流程
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to repair bot webhook';
      setError(message);
      console.error('[useSalesChannels] repairBot error:', err);
      return null;
    } finally {
      setBotRepairLoading(false);
    }
  }, [peerID]);

  const syncMenuButtonFn = useCallback(async (): Promise<StoreBotInfo | null> => {
    if (!peerID) return null;
    setBotMenuButtonSyncLoading(true);
    setError(null);
    try {
      const result = await syncBotMenuButton(peerID);
      setStoreBot(result);
      try {
        const status = await getBotWebhookStatus(peerID);
        setBotWebhookStatus(status);
      } catch (_refreshErr) {
        // 刷新失败不影响主流程
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync menu button';
      setError(message);
      console.error('[useSalesChannels] syncMenuButton error:', err);
      return null;
    } finally {
      setBotMenuButtonSyncLoading(false);
    }
  }, [peerID]);

  useEffect(() => {
    if (autoLoad) {
      loadStoreLinkFn();
      if (peerID) {
        loadStoreBotFn();
      }
    }
  }, [autoLoad, peerID, loadStoreLinkFn, loadStoreBotFn]);

  return {
    storeLink,
    storeLinkLoading,
    storeBot,
    storeBotLoading,
    storeBotNotFound,
    botWebhookStatus,
    botWebhookStatusLoading,
    botRepairLoading,
    botMenuButtonSyncLoading,
    error,
    loadStoreLink: loadStoreLinkFn,
    regenerateLink: regenerateLinkFn,
    loadStoreBot: loadStoreBotFn,
    bindBot: bindBotFn,
    unbindBot: unbindBotFn,
    loadBotWebhookStatus: loadBotWebhookStatusFn,
    repairBot: repairBotFn,
    syncMenuButton: syncMenuButtonFn,
  };
}

export default useSalesChannels;
