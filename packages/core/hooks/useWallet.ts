/**
 * useWallet Hook
 * 钱包连接 React Hook
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getWalletService,
  WalletService,
  WalletConnectionState,
  WalletInfo,
  WalletEvent,
  ChainId,
} from '../services/payment';

interface UseWalletReturn {
  // 状态
  isConnected: boolean;
  isConnecting: boolean;
  walletInfo: WalletInfo | null;
  connectionState: WalletConnectionState;
  error: Error | null;

  // 方法
  connect: () => Promise<WalletInfo | null>;
  /** 别名：等同于 connect */
  connectWallet: () => Promise<WalletInfo | null>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: ChainId) => Promise<boolean>;
  refreshBalance: () => Promise<string | null>;
  signMessage: (message: string) => Promise<string | null>;

  // 工具
  getSupportedChains: () => ChainId[];
  getCurrentChainId: () => ChainId | null;
  getCurrentAddress: () => string | null;
}

export function useWallet(): UseWalletReturn {
  const [walletService] = useState<WalletService>(() => getWalletService());
  const [connectionState, setConnectionState] = useState<WalletConnectionState>(
    WalletConnectionState.DISCONNECTED
  );
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 监听钱包事件
  useEffect(() => {
    const handleConnected = (info: unknown) => {
      setWalletInfo(info as WalletInfo);
      setConnectionState(WalletConnectionState.CONNECTED);
      setError(null);
    };

    const handleDisconnected = () => {
      setWalletInfo(null);
      setConnectionState(WalletConnectionState.DISCONNECTED);
    };

    const handleChainChanged = (info: unknown) => {
      setWalletInfo(info as WalletInfo);
    };

    const handleAccountChanged = (info: unknown) => {
      setWalletInfo(info as WalletInfo);
    };

    const handleError = (err: unknown) => {
      setError(err as Error);
      setConnectionState(WalletConnectionState.ERROR);
    };

    // 订阅事件
    const unsubConnected = walletService.on(WalletEvent.CONNECTED, handleConnected);
    const unsubDisconnected = walletService.on(WalletEvent.DISCONNECTED, handleDisconnected);
    const unsubChainChanged = walletService.on(WalletEvent.CHAIN_CHANGED, handleChainChanged);
    const unsubAccountChanged = walletService.on(WalletEvent.ACCOUNT_CHANGED, handleAccountChanged);
    const unsubError = walletService.on(WalletEvent.ERROR, handleError);

    // 初始化状态 - 使用 setTimeout 避免同步调用
    const initializeState = () => {
      const state = walletService.getState();
      const info = walletService.getWalletInfo();
      if (state !== connectionState) {
        setConnectionState(state);
      }
      if (info !== walletInfo) {
        setWalletInfo(info);
      }
    };

    // 延迟初始化以避免同步 setState
    const timeoutId = setTimeout(initializeState, 0);

    // 清理
    return () => {
      clearTimeout(timeoutId);
      unsubConnected();
      unsubDisconnected();
      unsubChainChanged();
      unsubAccountChanged();
      unsubError();
    };
  }, [walletService, connectionState, walletInfo]);

  // 连接钱包
  const connect = useCallback(async (): Promise<WalletInfo | null> => {
    setConnectionState(WalletConnectionState.CONNECTING);
    setError(null);
    return walletService.connect();
  }, [walletService]);

  // 断开连接
  const disconnect = useCallback(async (): Promise<void> => {
    await walletService.disconnect();
  }, [walletService]);

  // 切换链
  const switchChain = useCallback(
    async (chainId: ChainId): Promise<boolean> => {
      return walletService.switchChain(chainId);
    },
    [walletService]
  );

  // 刷新余额
  const refreshBalance = useCallback(async (): Promise<string | null> => {
    return walletService.refreshBalance();
  }, [walletService]);

  // 签名消息
  const signMessage = useCallback(
    async (message: string): Promise<string | null> => {
      return walletService.signMessage(message);
    },
    [walletService]
  );

  // 获取支持的链
  const getSupportedChains = useCallback((): ChainId[] => {
    return walletService.getSupportedChains();
  }, [walletService]);

  // 获取当前链 ID
  const getCurrentChainId = useCallback((): ChainId | null => {
    return walletService.getCurrentChainId();
  }, [walletService]);

  // 获取当前地址
  const getCurrentAddress = useCallback((): string | null => {
    return walletService.getCurrentAddress();
  }, [walletService]);

  return {
    // 状态
    isConnected: connectionState === WalletConnectionState.CONNECTED,
    isConnecting: connectionState === WalletConnectionState.CONNECTING,
    walletInfo,
    connectionState,
    error,

    // 方法
    connect,
    connectWallet: connect, // 别名
    disconnect,
    switchChain,
    refreshBalance,
    signMessage,

    // 工具
    getSupportedChains,
    getCurrentChainId,
    getCurrentAddress,
  };
}
