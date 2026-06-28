'use client';

/**
 * Wallet provider compatibility layer.
 *
 * The public frontend uses browser-injected providers and keeps wallet SDKs out
 * of the core dependency graph. The AppKit names remain exported for source
 * compatibility while integrations migrate to the generic wallet API.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CHAIN_IDS } from '../config/appkit';

type RequestArguments = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

interface EventProvider {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

interface Eip1193Provider extends EventProvider {
  request: (args: RequestArguments) => Promise<unknown>;
}

interface SolanaPublicKey {
  toString(): string;
}

interface InjectedSolanaProvider extends EventProvider {
  publicKey?: SolanaPublicKey | null;
  connect: () => Promise<{ publicKey?: SolanaPublicKey }>;
  disconnect?: () => Promise<void>;
}

type InjectedWalletProvider = Eip1193Provider | InjectedSolanaProvider;

export interface CaipNetwork {
  id: number | string;
  name?: string;
  chainId?: number;
  [key: string]: unknown;
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

export interface AppKitContextValue {
  /** Active injected provider. Kept as appKit for API compatibility. */
  appKit: InjectedWalletProvider | null;
  isConnected: boolean;
  address: string | null;
  chain: CaipNetwork | null;
  isInitializing: boolean;
  isInitialized: boolean;
  initialize: () => Promise<InjectedWalletProvider | null>;
  connect: (options?: ConnectOptions) => Promise<ConnectResult>;
  connectEVM: () => Promise<ConnectResult>;
  connectSolana: () => Promise<ConnectResult>;
  disconnect: () => Promise<DisconnectResult>;
  switchNetwork: (network: CaipNetwork) => Promise<SwitchNetworkResult>;
  getWalletProvider: () => InjectedWalletProvider | null;
  openModal: (options?: OpenModalOptions) => Promise<void>;
  closeModal: () => Promise<void>;
  networks: CaipNetwork[];
}

export interface AppKitProviderProps {
  children: ReactNode;
  /** Retained for compatibility; injected providers do not require a project ID. */
  projectId?: string;
  networks?: CaipNetwork[];
  autoInit?: boolean;
}

const DEFAULT_NETWORKS: CaipNetwork[] = [
  { id: CHAIN_IDS.ETHEREUM_MAINNET, chainId: CHAIN_IDS.ETHEREUM_MAINNET, name: 'Ethereum' },
  { id: CHAIN_IDS.SEPOLIA, chainId: CHAIN_IDS.SEPOLIA, name: 'Sepolia' },
];

function getInjectedProviders(): {
  ethereum?: Eip1193Provider;
  solana?: InjectedSolanaProvider;
} {
  if (typeof window === 'undefined') return {};
  const injectedWindow = window as typeof window & {
    ethereum?: Eip1193Provider;
    solana?: InjectedSolanaProvider;
  };
  return { ethereum: injectedWindow.ethereum, solana: injectedWindow.solana };
}

function parseChainId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = value.startsWith('0x') ? Number.parseInt(value, 16) : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

const AppKitContext = createContext<AppKitContextValue | null>(null);

export function AppKitProvider({
  children,
  networks = DEFAULT_NETWORKS,
  autoInit = true,
}: AppKitProviderProps) {
  const [provider, setProvider] = useState<InjectedWalletProvider | null>(null);
  const [namespace, setNamespace] = useState<'eip155' | 'solana' | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chain, setChain] = useState<CaipNetwork | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = useCallback(async (): Promise<InjectedWalletProvider | null> => {
    const injected = getInjectedProviders();
    const available = injected.ethereum ?? injected.solana ?? null;
    setIsInitialized(true);
    return available;
  }, []);

  const connectEVM = useCallback(async (): Promise<ConnectResult> => {
    const { ethereum } = getInjectedProviders();
    if (!ethereum) {
      return { success: false, error: new Error('No injected EVM wallet was found') };
    }

    setIsInitializing(true);
    try {
      const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const chainId = parseChainId(await ethereum.request({ method: 'eth_chainId' }));
      const nextAddress = accounts?.[0] ?? null;
      setProvider(ethereum);
      setNamespace('eip155');
      setAddress(nextAddress);
      setChain(chainId == null ? null : { id: chainId, chainId });
      setIsConnected(Boolean(nextAddress));
      setIsInitialized(true);
      return nextAddress
        ? { success: true }
        : { success: false, error: new Error('The wallet returned no account') };
    } catch (error) {
      return { success: false, error: toError(error) };
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const connectSolana = useCallback(async (): Promise<ConnectResult> => {
    const { solana } = getInjectedProviders();
    if (!solana) {
      return { success: false, error: new Error('No injected Solana wallet was found') };
    }

    setIsInitializing(true);
    try {
      const result = await solana.connect();
      const nextAddress = result.publicKey?.toString() ?? solana.publicKey?.toString() ?? null;
      setProvider(solana);
      setNamespace('solana');
      setAddress(nextAddress);
      setChain({ id: 'solana', name: 'Solana' });
      setIsConnected(Boolean(nextAddress));
      setIsInitialized(true);
      return nextAddress
        ? { success: true }
        : { success: false, error: new Error('The wallet returned no account') };
    } catch (error) {
      return { success: false, error: toError(error) };
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const connect = useCallback(
    async (options: ConnectOptions = {}): Promise<ConnectResult> => {
      if (options.namespace === 'solana') return connectSolana();
      if (options.namespace === 'bip122') {
        return {
          success: false,
          error: new Error('This payment method does not require a browser wallet connector'),
        };
      }
      return connectEVM();
    },
    [connectEVM, connectSolana]
  );

  const disconnect = useCallback(async (): Promise<DisconnectResult> => {
    try {
      if (namespace === 'solana') {
        await (provider as InjectedSolanaProvider | null)?.disconnect?.();
      }
      setProvider(null);
      setNamespace(null);
      setAddress(null);
      setChain(null);
      setIsConnected(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: toError(error) };
    }
  }, [namespace, provider]);

  const switchNetwork = useCallback(async (network: CaipNetwork): Promise<SwitchNetworkResult> => {
    const { ethereum } = getInjectedProviders();
    const chainId = parseChainId(network.chainId ?? network.id);
    if (!ethereum || chainId == null) {
      return { success: false, error: 'The selected network cannot be switched automatically' };
    }
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setProvider(ethereum);
      setNamespace('eip155');
      setChain({ ...network, id: chainId, chainId });
      return { success: true };
    } catch (error) {
      return { success: false, error: toError(error).message };
    }
  }, []);

  useEffect(() => {
    if (!autoInit) return;
    void initialize();
  }, [autoInit, initialize]);

  useEffect(() => {
    const { ethereum } = getInjectedProviders();
    if (!ethereum?.on) return;

    const handleAccounts = (...args: unknown[]) => {
      const accounts = Array.isArray(args[0]) ? (args[0] as string[]) : [];
      setAddress(accounts[0] ?? null);
      setIsConnected(Boolean(accounts[0]));
    };
    const handleChain = (...args: unknown[]) => {
      const chainId = parseChainId(args[0]);
      setChain(chainId == null ? null : { id: chainId, chainId });
    };
    ethereum.on('accountsChanged', handleAccounts);
    ethereum.on('chainChanged', handleChain);
    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccounts);
      ethereum.removeListener?.('chainChanged', handleChain);
    };
  }, []);

  const value = useMemo<AppKitContextValue>(
    () => ({
      appKit: provider,
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
      getWalletProvider: () => provider,
      openModal: async () => {
        await connect();
      },
      closeModal: async () => undefined,
      networks,
    }),
    [
      provider,
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
      networks,
    ]
  );

  return <AppKitContext.Provider value={value}>{children}</AppKitContext.Provider>;
}

export function useAppKit(): AppKitContextValue {
  const context = useContext(AppKitContext);
  if (!context) throw new Error('useAppKit must be used within AppKitProvider');
  return context;
}

export default AppKitProvider;
