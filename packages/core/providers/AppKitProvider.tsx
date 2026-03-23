'use client';

/**
 * AppKit Provider
 *
 * 提供钱包连接功能的 React Context Provider
 * 基于 Reown AppKit 1.8.15
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { createAppKit, type AppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { sepolia, mainnet, solana, solanaDevnet } from '@reown/appkit/networks';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { APPKIT_PROJECT_ID, APPKIT_METADATA } from '../config/appkit';
import { getEnvConfig } from '../config/env';

// ============= Theme Utils =============

/**
 * 获取当前主题模式
 */
function getCurrentThemeMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';

  // 检查 document class 或 data-theme 属性
  const isDark =
    document.documentElement.classList.contains('dark') ||
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return isDark ? 'dark' : 'light';
}

// ============= Types =============

// 通用网络类型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NetworkType = any;

// CaipNetwork 类型定义 (AppKit 内部类型)
interface CaipNetwork {
  id: number | string;
  name?: string;
  chainId?: number;
  [key: string]: unknown;
}

export interface AppKitContextValue {
  /** AppKit 实例 */
  appKit: AppKit | null;
  /** 是否已连接钱包 */
  isConnected: boolean;
  /** 当前钱包地址 */
  address: string | null;
  /** 当前链信息 */
  chain: CaipNetwork | null;
  /** 是否正在初始化 */
  isInitializing: boolean;
  /** 是否已初始化 */
  isInitialized: boolean;

  /** 初始化 AppKit (通常不需要手动调用) */
  initialize: () => Promise<AppKit | null>;
  /** 连接钱包 */
  connect: (options?: ConnectOptions) => Promise<ConnectResult>;
  /** 连接 EVM 钱包 */
  connectEVM: () => Promise<ConnectResult>;
  /** 连接 Solana 钱包 */
  connectSolana: () => Promise<ConnectResult>;
  /** 断开连接 */
  disconnect: () => Promise<DisconnectResult>;
  /** 切换网络 */
  switchNetwork: (network: NetworkType) => Promise<SwitchNetworkResult>;
  /** 获取钱包 Provider */
  getWalletProvider: () => unknown | null;
  /** 打开 Modal */
  openModal: (options?: OpenModalOptions) => Promise<void>;
  /** 关闭 Modal */
  closeModal: () => Promise<void>;

  /** 支持的网络列表 */
  networks: NetworkType[];
}

export interface ConnectOptions {
  view?: 'Connect' | 'Account';
  namespace?: 'eip155' | 'solana' | 'bip122';
}

export interface ConnectResult {
  success: boolean;
  error?: Error;
}

export interface DisconnectResult {
  success: boolean;
  error?: Error;
}

export interface SwitchNetworkResult {
  success: boolean;
  error?: string;
}

export interface OpenModalOptions {
  view?: 'Connect' | 'Account' | 'Networks';
}

// ============= Context =============

const AppKitContext = createContext<AppKitContextValue | null>(null);

// ============= Provider Props =============

export interface AppKitProviderProps {
  children: ReactNode;
  /** 自定义 Project ID (可选，默认使用配置中的) */
  projectId?: string;
  /** 自定义网络列表 (可选，默认根据环境自动选择) */
  networks?: NetworkType[];
  /** 是否自动初始化 (默认 true) */
  autoInit?: boolean;
}

// ============= Provider Component =============

export function AppKitProvider({
  children,
  projectId = APPKIT_PROJECT_ID,
  networks,
  autoInit = true,
}: AppKitProviderProps) {
  // 状态
  const [appKit, setAppKit] = useState<AppKit | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chain, setChain] = useState<CaipNetwork | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 防止重复初始化
  const initPromiseRef = useRef<Promise<AppKit | null> | null>(null);
  // 存储订阅清理函数
  const unsubscribeRefs = useRef<{
    account: (() => void) | null | void;
    chain: (() => void) | null | void;
  }>({ account: null, chain: null });

  // 获取网络列表 — 在 'use client' 组件内解析 AppKit 网络对象，
  // 避免 server bundle 触达 @reown/appkit
  const supportedNetworks = networks ?? (getEnvConfig().isTestEnv ? [sepolia, solanaDevnet] : [mainnet, solana]);

  /**
   * 检查并断开不支持的网络连接
   */
  const checkAndDisconnectUnsupported = useCallback(
    async (kit: AppKit) => {
      try {
        const isWalletConnected = kit.getIsConnectedState();
        if (!isWalletConnected) return;

        const currentNetwork = kit.getCaipNetwork();
        if (!currentNetwork) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supportedChainIds = supportedNetworks.map((n: any) => n.id);
        const currentChainId = currentNetwork.id;

        if (!supportedChainIds.includes(currentChainId as number)) {
          console.log('🔌 检测到不支持的网络，主动断开连接');
          await kit.disconnect();
        }
      } catch (error) {
        console.error('检查网络状态失败:', error);
      }
    },
    [supportedNetworks]
  );

  /**
   * 设置事件订阅
   */
  const setupSubscriptions = useCallback((kit: AppKit) => {
    // 清理旧订阅
    if (typeof unsubscribeRefs.current.account === 'function') {
      unsubscribeRefs.current.account();
    }
    if (typeof unsubscribeRefs.current.chain === 'function') {
      unsubscribeRefs.current.chain();
    }

    // 订阅账户变化
    unsubscribeRefs.current.account = kit.subscribeAccount(account => {
      setIsConnected(account?.isConnected || false);
      setAddress(account?.address || null);
    });

    // 订阅网络变化
    unsubscribeRefs.current.chain = kit.subscribeCaipNetworkChange(network => {
      setChain(network || null);
    });

    // 设置初始状态
    setIsConnected(kit.getIsConnectedState() || false);
    setAddress(kit.getAddress() || null);
    setChain(kit.getCaipNetwork() || null);
  }, []);

  /**
   * 初始化 AppKit
   */
  const initialize = useCallback(async (): Promise<AppKit | null> => {
    // 如果已经初始化，直接返回
    if (appKit) {
      return appKit;
    }

    // 如果正在初始化，等待完成
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    setIsInitializing(true);

    initPromiseRef.current = (async () => {
      try {
        console.log('🚀 开始初始化 AppKit...');

        const ethersAdapter = new EthersAdapter();
        const solanaAdapter = new SolanaAdapter({
          wallets: [],
        });

        const kit = createAppKit({
          adapters: [ethersAdapter, solanaAdapter],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          networks: supportedNetworks as any,
          metadata: APPKIT_METADATA,
          projectId,
          allowUnsupportedChain: true,
          features: {
            analytics: false,
            swaps: false,
            onramp: false,
            email: false,
            socials: false,
          },
          // 主题配置 - 适配应用主题
          themeMode: getCurrentThemeMode(),
          themeVariables: {
            // 根据主题使用不同的强调色，深色主题用更低调的颜色
            '--w3m-accent': getCurrentThemeMode() === 'dark' ? '#059669' : '#10b981',
            // 圆角与应用保持一致
            '--w3m-border-radius-master': '8px',
          },
        });

        // 检查并断开不支持的网络
        await checkAndDisconnectUnsupported(kit);

        // 设置订阅
        setupSubscriptions(kit);

        setAppKit(kit);
        setIsInitialized(true);

        console.log('✅ AppKit 初始化成功');
        return kit;
      } catch (error) {
        console.error('❌ 初始化 AppKit 失败:', error);
        initPromiseRef.current = null;
        throw error;
      } finally {
        setIsInitializing(false);
      }
    })();

    return initPromiseRef.current;
  }, [appKit, projectId, supportedNetworks, checkAndDisconnectUnsupported, setupSubscriptions]);

  /**
   * 连接钱包
   */
  const connect = useCallback(
    async (options: ConnectOptions = {}): Promise<ConnectResult> => {
      try {
        const kit = await initialize();
        if (!kit) {
          return { success: false, error: new Error('AppKit 初始化失败') };
        }
        await kit.open(options);
        return { success: true };
      } catch (error) {
        console.error('连接钱包失败:', error);
        return { success: false, error: error as Error };
      }
    },
    [initialize]
  );

  /**
   * 连接 EVM 钱包
   */
  const connectEVM = useCallback(async (): Promise<ConnectResult> => {
    return connect({ view: 'Connect', namespace: 'eip155' });
  }, [connect]);

  /**
   * 连接 Solana 钱包
   */
  const connectSolana = useCallback(async (): Promise<ConnectResult> => {
    return connect({ view: 'Connect', namespace: 'solana' });
  }, [connect]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(async (): Promise<DisconnectResult> => {
    try {
      if (appKit) {
        await appKit.disconnect();
      }
      setIsConnected(false);
      setAddress(null);
      setChain(null);
      return { success: true };
    } catch (error) {
      console.error('断开连接失败:', error);
      return { success: false, error: error as Error };
    }
  }, [appKit]);

  /**
   * 切换网络
   */
  const switchNetwork = useCallback(
    async (network: NetworkType): Promise<SwitchNetworkResult> => {
      try {
        const kit = await initialize();
        if (!kit) {
          return { success: false, error: 'AppKit 未初始化' };
        }
        console.log(`🔄 切换网络到: ${network.name}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await kit.switchNetwork(network as any);
        console.log(`✅ 已切换到 ${network.name} 网络`);
        return { success: true };
      } catch (error) {
        console.error('Failed to switch network:', error);
        return {
          success: false,
          error: (error as Error).message || 'Failed to switch network',
        };
      }
    },
    [initialize]
  );

  /**
   * 获取钱包 Provider
   */
  const getWalletProvider = useCallback(() => {
    return appKit?.getWalletProvider() || null;
  }, [appKit]);

  /**
   * 打开 Modal
   */
  const openModal = useCallback(
    async (options: OpenModalOptions = {}) => {
      const kit = await initialize();
      if (kit) {
        await kit.open(options);
      }
    },
    [initialize]
  );

  /**
   * 关闭 Modal
   */
  const closeModal = useCallback(async () => {
    if (appKit) {
      await appKit.close();
    }
  }, [appKit]);

  // 自动初始化
  useEffect(() => {
    if (autoInit) {
      initialize().catch(error => {
        console.error('自动初始化 AppKit 失败:', error);
      });
    }
  }, [autoInit, initialize]);

  // 监听主题变化，同步更新 AppKit 主题
  useEffect(() => {
    if (!appKit) return;

    // 更新主题和强调色
    const updateTheme = () => {
      const newTheme = getCurrentThemeMode();
      appKit.setThemeMode(newTheme);
      // 同时更新强调色
      appKit.setThemeVariables({
        '--w3m-accent': newTheme === 'dark' ? '#059669' : '#10b981',
      });
    };

    // 创建 MutationObserver 监听 html 元素的 class 和 data-theme 变化
    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    // 同时监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, [appKit]);

  // 清理订阅
  useEffect(() => {
    return () => {
      if (typeof unsubscribeRefs.current.account === 'function') {
        unsubscribeRefs.current.account();
      }
      if (typeof unsubscribeRefs.current.chain === 'function') {
        unsubscribeRefs.current.chain();
      }
    };
  }, []);

  // Context 值
  const contextValue: AppKitContextValue = {
    appKit,
    isConnected,
    address,
    chain,
    isInitializing,
    isInitialized,
    initialize,
    connect,
    connectEVM,
    connectSolana,
    disconnect,
    switchNetwork,
    getWalletProvider,
    openModal,
    closeModal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    networks: supportedNetworks as any,
  };

  return <AppKitContext.Provider value={contextValue}>{children}</AppKitContext.Provider>;
}

// ============= Hook =============

/**
 * 使用 AppKit 的 Hook
 *
 * @example
 * ```tsx
 * const { isConnected, address, connect, disconnect } = useAppKit();
 *
 * // 连接钱包
 * await connect();
 *
 * // 连接特定链
 * await connectEVM();
 *
 * // 断开连接
 * await disconnect();
 * ```
 */
export function useAppKit(): AppKitContextValue {
  const context = useContext(AppKitContext);
  if (!context) {
    throw new Error('useAppKit must be used within AppKitProvider');
  }
  return context;
}

export default AppKitProvider;
