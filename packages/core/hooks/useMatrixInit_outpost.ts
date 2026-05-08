/**
 * Outpost stub — Matrix is stripped at build time.
 */
import { useCallback } from 'react';

export interface UseMatrixInitOptions {
  enabled?: boolean;
  autoConnect?: boolean;
  maxRetries?: number;
  retryInterval?: number;
}

export interface UseMatrixInitReturn {
  isInitialized: boolean;
  isConnected: boolean;
  error: string | null;
  retryCount: number;
  initialize: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  retry: () => Promise<boolean>;
}

export function useMatrixInit(_options?: UseMatrixInitOptions): UseMatrixInitReturn {
  const stableInit = useCallback(async () => false, []);
  const stableDisconnect = useCallback(async () => {}, []);
  return {
    isInitialized: false,
    isConnected: false,
    error: null,
    retryCount: 0,
    initialize: stableInit,
    disconnect: stableDisconnect,
    retry: stableInit,
  };
}

export default useMatrixInit;
