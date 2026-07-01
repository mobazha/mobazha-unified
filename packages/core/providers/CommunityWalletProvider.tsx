'use client';

/**
 * Community Edition wallet provider — no-op replacement for AppKit.
 *
 * UTXO payments are backend-monitored; external wallet connectors for
 * commercial or private payment rails are excluded from Community Edition bundles.
 *
 * Dormant AppKitProvider source remains for type-checking and future private builds.
 */

import { createContext, useContext, type ReactNode } from 'react';

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
  switchNetwork: (network: unknown) => Promise<SwitchNetworkResult>;
  getWalletProvider: () => null;
  openModal: (options?: OpenModalOptions) => Promise<void>;
  closeModal: () => Promise<void>;
  networks: unknown[];
}

export interface AppKitProviderProps {
  children: ReactNode;
  projectId?: string;
  networks?: unknown[];
  autoInit?: boolean;
}

const unavailableResult = (): ConnectResult => ({
  success: false,
  error: new Error('External wallet connections are not available in Community Edition'),
});

const COMMUNITY_WALLET_CONTEXT: AppKitContextValue = {
  appKit: null,
  isConnected: false,
  address: null,
  chain: null,
  isInitializing: false,
  isInitialized: true,
  initialize: async () => null,
  connect: async () => unavailableResult(),
  connectEVM: async () => unavailableResult(),
  connectSolana: async () => unavailableResult(),
  disconnect: async () => ({ success: true }),
  switchNetwork: async () => ({
    success: false,
    error: 'Network switching is not available in Community Edition',
  }),
  getWalletProvider: () => null,
  openModal: async () => undefined,
  closeModal: async () => undefined,
  networks: [],
};

const CommunityWalletContext = createContext<AppKitContextValue>(COMMUNITY_WALLET_CONTEXT);

export function AppKitProvider({ children }: AppKitProviderProps) {
  return (
    <CommunityWalletContext.Provider value={COMMUNITY_WALLET_CONTEXT}>
      {children}
    </CommunityWalletContext.Provider>
  );
}

export function useAppKit(): AppKitContextValue {
  return useContext(CommunityWalletContext);
}

export default AppKitProvider;
