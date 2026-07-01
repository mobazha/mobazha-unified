'use client';

import { createContext, useContext, type ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NetworkType = any;

interface CaipNetwork {
  id: number | string;
  name?: string;
  chainId?: number;
  [key: string]: unknown;
}

export interface AppKitContextValue {
  appKit: null;
  isConnected: boolean;
  address: string | null;
  chain: CaipNetwork | null;
  isInitializing: boolean;
  isInitialized: boolean;
  initialize: () => Promise<null>;
  connect: (options?: ConnectOptions) => Promise<ConnectResult>;
  connectEVM: () => Promise<ConnectResult>;
  connectSolana: () => Promise<ConnectResult>;
  disconnect: () => Promise<DisconnectResult>;
  switchNetwork: (network: NetworkType) => Promise<SwitchNetworkResult>;
  getWalletProvider: () => unknown | null;
  openModal: (options?: OpenModalOptions) => Promise<void>;
  closeModal: () => Promise<void>;
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

export interface AppKitProviderProps {
  children: ReactNode;
  projectId?: string;
  networks?: NetworkType[];
  autoInit?: boolean;
}

const noop = async () => ({ success: false as const });

const stubValue: AppKitContextValue = {
  appKit: null,
  isConnected: false,
  address: null,
  chain: null,
  isInitializing: false,
  isInitialized: false,
  initialize: async () => null,
  connect: noop,
  connectEVM: noop,
  connectSolana: noop,
  disconnect: async () => ({ success: true }),
  switchNetwork: noop,
  getWalletProvider: () => null,
  openModal: async () => {},
  closeModal: async () => {},
  networks: [],
};

const AppKitContext = createContext<AppKitContextValue | null>(stubValue);

export function AppKitProvider({ children }: AppKitProviderProps) {
  return <AppKitContext.Provider value={stubValue}>{children}</AppKitContext.Provider>;
}

export function useAppKit(): AppKitContextValue {
  return useContext(AppKitContext) ?? stubValue;
}

export default AppKitProvider;
