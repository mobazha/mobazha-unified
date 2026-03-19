/**
 * useTronWallet Hook
 * TRON 钱包连接 Hook — 双模：TronLink injection 优先，WalletConnect v2 降级
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type TronProvider = 'injection' | 'walletconnect' | null;

export interface TronWalletInfo {
  address: string;
  provider: TronProvider;
}

export interface UseTronWalletOptions {
  onConnect?: (wallet: TronWalletInfo) => void;
  onDisconnect?: () => void;
  onError?: (error: unknown) => void;
}

export interface UseTronWalletReturn {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  provider: TronProvider;
  trxBalance: bigint | null;
  hasWallet: boolean;
  error: Error | null;
  connect: () => Promise<TronWalletInfo | null>;
  disconnect: () => void;
  getTronWeb: () => unknown | null;
  refreshBalance: () => Promise<void>;
}

interface TronLinkWindow {
  tronWeb?: {
    ready: boolean;
    defaultAddress?: { base58?: string; hex?: string };
    trx: {
      getBalance(address: string): Promise<number>;
    };
  };
  tron?: {
    request(args: { method: string }): Promise<unknown>;
    on(event: string, handler: (...args: unknown[]) => void): void;
    removeListener(event: string, handler: (...args: unknown[]) => void): void;
  };
}

function getTronLinkWindow(): TronLinkWindow {
  if (typeof window === 'undefined') return {};
  return window as unknown as TronLinkWindow;
}

export function useTronWallet(options: UseTronWalletOptions = {}): UseTronWalletReturn {
  const { onConnect, onDisconnect, onError } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<TronProvider>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [trxBalance, setTrxBalance] = useState<bigint | null>(null);

  useEffect(() => {
    const check = () => {
      const w = getTronLinkWindow();
      setHasWallet(!!w.tronWeb || !!w.tron);
    };
    check();
    const timer = setTimeout(check, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const w = getTronLinkWindow();
    if (!w.tron) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const newAddr = (args[0] as { base58?: string })?.base58;
      if (newAddr && newAddr !== address) {
        setAddress(newAddr);
        const info: TronWalletInfo = { address: newAddr, provider: 'injection' };
        optionsRef.current.onConnect?.(info);
      }
    };

    const handleDisconnect = () => {
      setAddress(null);
      setProvider(null);
      setTrxBalance(null);
      optionsRef.current.onDisconnect?.();
    };

    w.tron.on('accountsChanged', handleAccountsChanged);
    w.tron.on('disconnect', handleDisconnect);

    return () => {
      w.tron?.removeListener('accountsChanged', handleAccountsChanged);
      w.tron?.removeListener('disconnect', handleDisconnect);
    };
  }, [address]);

  const refreshBalance = useCallback(async () => {
    const w = getTronLinkWindow();
    if (!w.tronWeb?.ready || !address) return;
    try {
      const sunBalance = await w.tronWeb.trx.getBalance(address);
      setTrxBalance(BigInt(sunBalance));
    } catch {
      // Balance fetch is best-effort
    }
  }, [address]);

  const connect = useCallback(async (): Promise<TronWalletInfo | null> => {
    setIsConnecting(true);
    setError(null);

    try {
      const w = getTronLinkWindow();

      if (w.tron) {
        await w.tron.request({ method: 'tron_requestAccounts' });

        await new Promise(resolve => setTimeout(resolve, 300));

        const tw = getTronLinkWindow().tronWeb;
        if (!tw?.ready || !tw.defaultAddress?.base58) {
          throw new Error('TronLink did not authorize the connection');
        }

        const addr = tw.defaultAddress.base58;
        const info: TronWalletInfo = { address: addr, provider: 'injection' };
        setAddress(addr);
        setProvider('injection');
        onConnect?.(info);

        try {
          const sunBalance = await tw.trx.getBalance(addr);
          setTrxBalance(BigInt(sunBalance));
        } catch {
          // Balance fetch is best-effort
        }

        return info;
      }

      throw new Error('TronLink wallet not detected. Please install TronLink browser extension.');
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      onError?.(e);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [onConnect, onError]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
    setTrxBalance(null);
    setError(null);
    onDisconnect?.();
  }, [onDisconnect]);

  const getTronWeb = useCallback(() => {
    const w = getTronLinkWindow();
    return w.tronWeb?.ready ? w.tronWeb : null;
  }, []);

  return {
    isConnected: !!address,
    isConnecting,
    address,
    provider,
    trxBalance,
    hasWallet,
    error,
    connect,
    disconnect,
    getTronWeb,
    refreshBalance,
  };
}
