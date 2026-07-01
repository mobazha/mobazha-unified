/**
 * useStandaloneStoreInfo Hook
 *
 * Fetches local node connectivity and domain info via Node API
 * (GET /v1/system/network + GET /v1/system/domain).
 *
 * Only active when `enabled` is true (typically `isStandaloneMode()`).
 * SaaS mode skips both calls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { NetworkConfigResponse, DomainConfigResponse } from '../services/api/system';
import { getNetworkConfig, getDomainConfig } from '../services/api/system';

export interface StandaloneStoreInfo {
  connectivity: string;
  domain: string;
  overlayType: string;
  overlayDomain?: string;
  tlsMode: string;
  dockerManaged: boolean;
}

export interface UseStandaloneStoreInfoOptions {
  enabled?: boolean;
}

export interface UseStandaloneStoreInfoReturn {
  info: StandaloneStoreInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_INFO: StandaloneStoreInfo = {
  connectivity: 'public',
  domain: '',
  overlayType: '',
  dockerManaged: false,
  tlsMode: '',
};

export function useStandaloneStoreInfo(
  options: UseStandaloneStoreInfoOptions = {}
): UseStandaloneStoreInfoReturn {
  const { enabled = false } = options;

  const [info, setInfo] = useState<StandaloneStoreInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [network, domain] = await Promise.all([
        getNetworkConfig().catch(
          (): NetworkConfigResponse => ({
            connectivity: 'public',
            overlayType: '',
            dockerManaged: false,
            gatewayPort: 5102,
          })
        ),
        getDomainConfig().catch(
          (): DomainConfigResponse => ({
            domain: '',
            connectivity: 'public',
            overlayType: '',
            tlsMode: '',
          })
        ),
      ]);

      setInfo({
        connectivity: network.connectivity || domain.connectivity || 'public',
        domain: domain.domain || '',
        overlayType: network.overlayType || domain.overlayType || '',
        overlayDomain: network.overlayDomain || domain.overlayDomain,
        tlsMode: domain.tlsMode || '',
        dockerManaged: network.dockerManaged,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store info');
      setInfo(DEFAULT_INFO);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchInfo();
    }
  }, [enabled, fetchInfo]);

  // Auto-refresh when the tab becomes visible again (e.g. returning
  // from System Settings after saving a domain).
  const fetchRef = useRef(fetchInfo);
  fetchRef.current = fetchInfo;
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      if (document.visibilityState === 'visible') {
        fetchRef.current();
      }
    };
    document.addEventListener('visibilitychange', handler);
    // Also handle SPA navigation within the same tab via focus
    window.addEventListener('focus', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }, [enabled]);

  return { info, loading, error, refresh: fetchInfo };
}

export default useStandaloneStoreInfo;
