/**
 * useSolanaWallet Hook
 * Solana 钱包连接 Hook
 *
 * @deprecated Use AppKit connectSolana() + SolanaPaymentExecutor instead.
 */

declare global {
  interface Window {
    solana?: unknown;
    phantom?: { solana?: unknown };
  }
}

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getSolanaWalletService,
  SolanaConnectionState,
  SolanaWalletEvent,
  SolanaWalletInfo,
  SolanaNetwork,
  SolanaTransactionParams,
  SolanaTransactionResult,
  SolanaWalletServiceConfig,
} from '../services/payment/solana';

export interface UseSolanaWalletOptions extends Partial<SolanaWalletServiceConfig> {
  onConnect?: (wallet: SolanaWalletInfo) => void;
  onDisconnect?: () => void;
  onAccountChange?: (wallet: SolanaWalletInfo) => void;
  onError?: (error: unknown) => void;
}

export interface UseSolanaWalletReturn {
  // 状态
  walletInfo: SolanaWalletInfo | null;
  connectionState: SolanaConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;

  // 操作
  connect: () => Promise<SolanaWalletInfo | null>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<string | null>;
  setNetwork: (network: SolanaNetwork) => void;

  // 交易
  sendTransaction: (params: SolanaTransactionParams) => Promise<SolanaTransactionResult | null>;
  signMessage: (message: string) => Promise<string | null>;

  // Token
  getTokenBalance: (mint: string) => Promise<string>;

  // 辅助
  hasWallet: boolean;
  network: SolanaNetwork;
}

export function useSolanaWallet(options: UseSolanaWalletOptions = {}): UseSolanaWalletReturn {
  const { onConnect, onDisconnect, onAccountChange, onError, ...config } = options;

  // 获取 service 实例（在 ref 外部，避免渲染期间访问 ref）
  const [service] = useState(() => getSolanaWalletService(config));
  const serviceRef = useRef(service);

  const [walletInfo, setWalletInfo] = useState<SolanaWalletInfo | null>(null);
  const [connectionState, setConnectionState] = useState<SolanaConnectionState>(
    SolanaConnectionState.DISCONNECTED
  );
  const [error, setError] = useState<Error | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [network, setNetworkState] = useState<SolanaNetwork>(() => service.getNetwork());

  // 检查钱包是否可用
  useEffect(() => {
    const checkWallet = () => {
      if (typeof window !== 'undefined') {
        setHasWallet(!!(window.solana || window.phantom?.solana));
      }
    };

    checkWallet();
    // 延迟检查，因为某些钱包可能延迟注入
    const timer = setTimeout(checkWallet, 1000);
    return () => clearTimeout(timer);
  }, []);

  // 设置事件监听
  useEffect(() => {
    const service = serviceRef.current;

    const handleConnected = (data: unknown) => {
      const wallet = data as SolanaWalletInfo;
      setWalletInfo(wallet);
      setConnectionState(SolanaConnectionState.CONNECTED);
      setError(null);
      onConnect?.(wallet);
    };

    const handleDisconnected = () => {
      setWalletInfo(null);
      setConnectionState(SolanaConnectionState.DISCONNECTED);
      onDisconnect?.();
    };

    const handleAccountChanged = (data: unknown) => {
      const wallet = data as SolanaWalletInfo;
      setWalletInfo(wallet);
      onAccountChange?.(wallet);
    };

    const handleError = (err: unknown) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setConnectionState(SolanaConnectionState.ERROR);
      onError?.(err);
    };

    // 注册监听器
    const unsubConnected = service.on(SolanaWalletEvent.CONNECTED, handleConnected);
    const unsubDisconnected = service.on(SolanaWalletEvent.DISCONNECTED, handleDisconnected);
    const unsubAccountChanged = service.on(SolanaWalletEvent.ACCOUNT_CHANGED, handleAccountChanged);
    const unsubError = service.on(SolanaWalletEvent.ERROR, handleError);

    // 恢复连接状态
    const currentWallet = service.getWalletInfo();
    if (currentWallet) {
      setWalletInfo(currentWallet);
      setConnectionState(service.getState());
    }

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubAccountChanged();
      unsubError();
    };
  }, [onConnect, onDisconnect, onAccountChange, onError]);

  // 连接钱包
  const connect = useCallback(async (): Promise<SolanaWalletInfo | null> => {
    setConnectionState(SolanaConnectionState.CONNECTING);
    setError(null);
    return serviceRef.current.connect();
  }, []);

  // 断开连接
  const disconnect = useCallback(async (): Promise<void> => {
    await serviceRef.current.disconnect();
  }, []);

  // 刷新余额
  const refreshBalance = useCallback(async (): Promise<string | null> => {
    const balance = await serviceRef.current.refreshBalance();
    if (balance && walletInfo) {
      setWalletInfo({ ...walletInfo, balance });
    }
    return balance;
  }, [walletInfo]);

  // 设置网络
  const setNetwork = useCallback(
    (newNetwork: SolanaNetwork): void => {
      serviceRef.current.setNetwork(newNetwork);
      setNetworkState(newNetwork);
      if (walletInfo) {
        setWalletInfo({ ...walletInfo, network: newNetwork });
      }
    },
    [walletInfo]
  );

  // 发送交易
  const sendTransaction = useCallback(
    async (params: SolanaTransactionParams): Promise<SolanaTransactionResult | null> => {
      return serviceRef.current.sendTransaction(params);
    },
    []
  );

  // 签名消息
  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    return serviceRef.current.signMessage(message);
  }, []);

  // 获取 Token 余额
  const getTokenBalance = useCallback(async (mint: string): Promise<string> => {
    return serviceRef.current.getTokenBalance(mint);
  }, []);

  return {
    // 状态
    walletInfo,
    connectionState,
    isConnected: connectionState === SolanaConnectionState.CONNECTED,
    isConnecting: connectionState === SolanaConnectionState.CONNECTING,
    error,

    // 操作
    connect,
    disconnect,
    refreshBalance,
    setNetwork,

    // 交易
    sendTransaction,
    signMessage,

    // Token
    getTokenBalance,

    // 辅助
    hasWallet,
    network,
  };
}

// 常用 SPL Token 地址
export const SOLANA_TOKENS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  SRM: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
};

// Solana 网络配置
export const SOLANA_NETWORKS: Record<SolanaNetwork, { name: string; explorer: string }> = {
  'mainnet-beta': {
    name: 'Mainnet',
    explorer: 'https://explorer.solana.com',
  },
  testnet: {
    name: 'Testnet',
    explorer: 'https://explorer.solana.com?cluster=testnet',
  },
  devnet: {
    name: 'Devnet',
    explorer: 'https://explorer.solana.com?cluster=devnet',
  },
};
