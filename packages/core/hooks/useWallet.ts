/**
 * useWallet Hook
 * Provider-neutral wallet connection React hook.
 * Must be used inside the compatibility AppKitProvider.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserProvider, JsonRpcSigner, formatEther } from 'ethers';
import { ChainId, WalletConnectionState, WalletInfo, WalletEvent } from '../services/payment';
import { useAppKit } from '../providers/AppKitProvider';
import { getCurrentChainId } from '../config/appkit';

// Default chain ID from appkit config
const DEFAULT_CHAIN_ID = getCurrentChainId();

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

  // AppKit 扩展
  openModal: (options?: { view?: 'Connect' | 'Account' | 'Networks' }) => Promise<void>;
  getProvider: () => BrowserProvider | null;
  getSigner: () => Promise<JsonRpcSigner | null>;
}

/**
 * Connect to the wallet provider exposed by the shared provider context.
 *
 * 注意：必须在 AppKitProvider 内部使用此 Hook
 *
 * @example
 * ```tsx
 * const { isConnected, connect, disconnect, walletInfo } = useWallet();
 *
 * // 连接钱包（打开 AppKit Modal）
 * await connect();
 *
 * // 断开连接
 * await disconnect();
 *
 * // 获取当前地址
 * const address = walletInfo?.address;
 * ```
 */
export function useWallet(): UseWalletReturn {
  // 使用 AppKit Context - 必须在顶层调用
  const appKitContext = useAppKit();

  const {
    isConnected: appKitConnected,
    isInitializing,
    address: appKitAddress,
    chain: appKitChain,
    connect: appKitConnect,
    disconnect: appKitDisconnect,
    switchNetwork: appKitSwitchNetwork,
    openModal: appKitOpenModal,
    getWalletProvider,
    networks,
  } = appKitContext;

  // 本地状态
  const [error, setError] = useState<Error | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  // 派生连接状态
  const connectionState = useMemo((): WalletConnectionState => {
    if (isInitializing) return WalletConnectionState.CONNECTING;
    if (appKitConnected) return WalletConnectionState.CONNECTED;
    if (error) return WalletConnectionState.ERROR;
    return WalletConnectionState.DISCONNECTED;
  }, [isInitializing, appKitConnected, error]);

  // 获取链 ID
  const chainId = useMemo((): ChainId | null => {
    if (!appKitChain) return null;
    // AppKit chain 可能是 number 或 string (caip format)
    const id =
      typeof appKitChain.id === 'number' ? appKitChain.id : parseInt(String(appKitChain.id));
    return isNaN(id) ? null : (id as ChainId);
  }, [appKitChain]);

  // 构建钱包信息
  const walletInfo = useMemo((): WalletInfo | null => {
    if (!appKitConnected || !appKitAddress) return null;
    return {
      address: appKitAddress,
      chainId: chainId || (DEFAULT_CHAIN_ID as ChainId), // 默认 Sepolia
      balance: balance || '0',
      provider: 'AppKit',
    };
  }, [appKitConnected, appKitAddress, chainId, balance]);

  // 初始化 Provider
  useEffect(() => {
    const initProvider = async () => {
      if (!appKitConnected || !getWalletProvider) {
        setProvider(null);
        return;
      }

      try {
        const walletProvider = getWalletProvider();
        if (walletProvider) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const browserProvider = new BrowserProvider(walletProvider as any);
          setProvider(browserProvider);

          // 获取余额
          if (appKitAddress) {
            const bal = await browserProvider.getBalance(appKitAddress);
            setBalance(formatEther(bal));
          }
        }
      } catch (err) {
        console.error('Failed to initialize provider:', err);
        setProvider(null);
      }
    };

    initProvider();
  }, [appKitConnected, appKitAddress, getWalletProvider]);

  // 连接钱包
  const connect = useCallback(async (): Promise<WalletInfo | null> => {
    if (!appKitConnect) {
      setError(new Error('AppKit not initialized'));
      return null;
    }

    setError(null);
    try {
      const result = await appKitConnect();
      if (!result.success) {
        setError(result.error || new Error('Connection failed'));
        return null;
      }
      // 返回当前钱包信息（会在状态更新后可用）
      return walletInfo;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [appKitConnect, walletInfo]);

  // 断开连接
  const disconnect = useCallback(async (): Promise<void> => {
    if (!appKitDisconnect) return;

    try {
      await appKitDisconnect();
      setBalance(null);
      setProvider(null);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }, [appKitDisconnect]);

  // 切换链
  const switchChain = useCallback(
    async (targetChainId: ChainId): Promise<boolean> => {
      if (!appKitSwitchNetwork) return false;

      try {
        // 从 networks 中找到对应的网络配置
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const targetNetwork = networks.find((n: any) => n.id === targetChainId);
        if (!targetNetwork) {
          setError(new Error(`Network ${targetChainId} not supported`));
          return false;
        }

        const result = await appKitSwitchNetwork(targetNetwork);
        return result.success;
      } catch (err) {
        setError(err as Error);
        return false;
      }
    },
    [appKitSwitchNetwork, networks]
  );

  // 刷新余额
  const refreshBalance = useCallback(async (): Promise<string | null> => {
    if (!provider || !appKitAddress) return null;

    try {
      const bal = await provider.getBalance(appKitAddress);
      const balStr = formatEther(bal);
      setBalance(balStr);
      return balStr;
    } catch {
      return null;
    }
  }, [provider, appKitAddress]);

  // 签名消息
  const signMessage = useCallback(
    async (message: string): Promise<string | null> => {
      if (!provider) return null;

      try {
        const signer = await provider.getSigner();
        return await signer.signMessage(message);
      } catch (err) {
        setError(err as Error);
        return null;
      }
    },
    [provider]
  );

  // 获取支持的链
  const getSupportedChains = useCallback((): ChainId[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return networks.map((n: any) => n.id as ChainId);
  }, [networks]);

  // 获取当前链 ID
  const getCurrentChainId = useCallback((): ChainId | null => {
    return chainId;
  }, [chainId]);

  // 获取当前地址
  const getCurrentAddress = useCallback((): string | null => {
    return appKitAddress;
  }, [appKitAddress]);

  // 打开 Modal
  const openModal = useCallback(
    async (options?: { view?: 'Connect' | 'Account' | 'Networks' }) => {
      if (appKitOpenModal) {
        await appKitOpenModal(options);
      }
    },
    [appKitOpenModal]
  );

  // 获取 Provider
  const getProvider = useCallback((): BrowserProvider | null => {
    return provider;
  }, [provider]);

  // 获取 Signer
  const getSigner = useCallback(async (): Promise<JsonRpcSigner | null> => {
    if (!provider) return null;
    try {
      return await provider.getSigner();
    } catch {
      return null;
    }
  }, [provider]);

  return {
    // 状态
    isConnected: appKitConnected,
    isConnecting: isInitializing,
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

    // Wallet provider compatibility API
    openModal,
    getProvider,
    getSigner,
  };
}

// 导出事件类型以保持兼容性
export { WalletEvent };
