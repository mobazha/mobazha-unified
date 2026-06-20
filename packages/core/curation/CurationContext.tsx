'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CurationProvider } from './provider';
import type { CurationConfig } from './types';

interface CurationContextValue {
  config: CurationConfig | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const CurationContext = createContext<CurationContextValue | null>(null);

export function CurationConfigProvider({
  provider,
  initialConfig = null,
  children,
}: {
  provider: CurationProvider;
  initialConfig?: CurationConfig | null;
  children: ReactNode;
}) {
  const [config, setConfig] = useState<CurationConfig | null>(initialConfig);
  const [loading, setLoading] = useState(!initialConfig);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const hasInitialConfig = initialConfig !== null;

  const retry = useCallback(() => setReloadToken(token => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (hasInitialConfig && reloadToken === 0) {
      return;
    }

    const loadConfig = async () => {
      if (!hasInitialConfig && !cancelled) {
        setLoading(true);
      }
      if (!cancelled) {
        setError(null);
      }

      try {
        const next = await provider.getConfig();
        if (!cancelled) {
          setConfig(next);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load marketplace config');
          setLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [provider, reloadToken, hasInitialConfig]);

  const value = useMemo(() => ({ config, loading, error, retry }), [config, loading, error, retry]);

  return <CurationContext.Provider value={value}>{children}</CurationContext.Provider>;
}

export function useCuration(): CurationContextValue {
  const ctx = useContext(CurationContext);
  if (!ctx) {
    throw new Error('useCuration requires CurationConfigProvider');
  }
  return ctx;
}
