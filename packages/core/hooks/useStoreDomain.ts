/**
 * useStoreDomain Hook
 *
 * Manages store branded domain (handle / subdomain) state.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { StoreDomainInfo, HandleAvailability } from '../services/api/salesChannels';
import {
  getStoreDomain,
  setStoreDomainHandle,
  deleteStoreDomain,
  checkHandleAvailability,
} from '../services/api/salesChannels';

export interface UseStoreDomainOptions {
  peerID?: string;
  autoLoad?: boolean;
}

export interface UseStoreDomainReturn {
  domain: StoreDomainInfo | null;
  loading: boolean;
  error: string | null;

  availability: HandleAvailability | null;
  checking: boolean;

  loadDomain: () => Promise<void>;
  setHandle: (handle: string) => Promise<StoreDomainInfo | null>;
  removeDomain: () => Promise<boolean>;
  checkAvailability: (handle: string) => Promise<HandleAvailability | null>;
}

export function useStoreDomain(options: UseStoreDomainOptions = {}): UseStoreDomainReturn {
  const { peerID, autoLoad = false } = options;

  const [domain, setDomain] = useState<StoreDomainInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availability, setAvailability] = useState<HandleAvailability | null>(null);
  const [checking, setChecking] = useState(false);
  const checkSeq = useRef(0);

  const loadDomain = useCallback(async () => {
    if (!peerID) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getStoreDomain(peerID);
      setDomain(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domain');
    } finally {
      setLoading(false);
    }
  }, [peerID]);

  const setHandle = useCallback(
    async (handle: string): Promise<StoreDomainInfo | null> => {
      if (!peerID) return null;
      setError(null);
      try {
        const result = await setStoreDomainHandle(peerID, handle);
        setDomain(result);
        setAvailability(null);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set handle';
        setError(message);
        return null;
      }
    },
    [peerID]
  );

  const removeDomain = useCallback(async (): Promise<boolean> => {
    if (!peerID) return false;
    setError(null);
    try {
      await deleteStoreDomain(peerID);
      setDomain(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove domain');
      return false;
    }
  }, [peerID]);

  const checkAvailabilityFn = useCallback(
    async (handle: string): Promise<HandleAvailability | null> => {
      const seq = ++checkSeq.current;
      setChecking(true);
      try {
        const result = await checkHandleAvailability(handle);
        if (seq === checkSeq.current) {
          setAvailability(result);
        }
        return result;
      } catch {
        if (seq === checkSeq.current) {
          setAvailability(null);
        }
        return null;
      } finally {
        if (seq === checkSeq.current) {
          setChecking(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (autoLoad && peerID) {
      loadDomain();
    }
  }, [autoLoad, peerID, loadDomain]);

  return {
    domain,
    loading,
    error,
    availability,
    checking,
    loadDomain,
    setHandle,
    removeDomain,
    checkAvailability: checkAvailabilityFn,
  };
}

export default useStoreDomain;
