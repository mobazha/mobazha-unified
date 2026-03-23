/**
 * useSalesChannels Hook
 *
 * Manages Store Links and Telegram Bot binding state.
 */

import { useState, useCallback, useEffect } from 'react';
import type { StoreLinkInfo, StoreBotInfo } from '../types/salesChannels';
import {
  getStoreLink,
  regenerateStoreLink,
  getStoreBot,
  bindStoreBot,
  unbindStoreBot,
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

  error: string | null;

  loadStoreLink: () => Promise<void>;
  regenerateLink: () => Promise<StoreLinkInfo | null>;
  loadStoreBot: () => Promise<void>;
  bindBot: (botToken: string) => Promise<StoreBotInfo | null>;
  unbindBot: () => Promise<boolean>;
}

export function useSalesChannels(options: UseSalesChannelsOptions = {}): UseSalesChannelsReturn {
  const { peerID, autoLoad = false } = options;

  const [storeLink, setStoreLink] = useState<StoreLinkInfo | null>(null);
  const [storeLinkLoading, setStoreLinkLoading] = useState(false);

  const [storeBot, setStoreBot] = useState<StoreBotInfo | null>(null);
  const [storeBotLoading, setStoreBotLoading] = useState(false);
  const [storeBotNotFound, setStoreBotNotFound] = useState(false);

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
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unbind bot';
      setError(message);
      console.error('[useSalesChannels] unbindBot error:', err);
      return false;
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
    error,
    loadStoreLink: loadStoreLinkFn,
    regenerateLink: regenerateLinkFn,
    loadStoreBot: loadStoreBotFn,
    bindBot: bindBotFn,
    unbindBot: unbindBotFn,
  };
}

export default useSalesChannels;
