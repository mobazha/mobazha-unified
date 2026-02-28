'use client';

/**
 * Store Branding Config Hook — PG-201
 *
 * Provides storefront config fetching and saving for both
 * the owner (admin editor) and public (store visitor) contexts.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { StoreConfig } from '../types/storeConfig';
import * as storefrontApi from '../services/api/storefront';

// ---------------------------------------------------------------------------
// Owner hook (authenticated — admin editor)
// ---------------------------------------------------------------------------

export function useStorefrontConfig() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await storefrontApi.getStorefrontConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storefront config');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (newConfig: StoreConfig) => {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await storefrontApi.saveStorefrontConfig(newConfig);
      setConfig(saved);
      return saved;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save storefront config';
      setError(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { config, isLoading, isSaving, error, refetch: fetch, save };
}

// ---------------------------------------------------------------------------
// Public hook (no auth — store visitor)
// ---------------------------------------------------------------------------

export function useStorefrontConfigPublic(peerID: string | null) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevPeerID = useRef<string | null>(null);

  const fetch = useCallback(async () => {
    if (!peerID) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await storefrontApi.getStorefrontConfigPublic(peerID);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storefront config');
    } finally {
      setIsLoading(false);
    }
  }, [peerID]);

  useEffect(() => {
    if (peerID && peerID !== prevPeerID.current) {
      prevPeerID.current = peerID;
      fetch();
    }
  }, [peerID, fetch]);

  return { config, isLoading, error, refetch: fetch };
}
