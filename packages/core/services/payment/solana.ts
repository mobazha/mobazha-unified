/**
 * Solana Payment Types & Constants
 *
 * Wallet connection is now handled by AppKit SolanaAdapter
 * (see providers/AppKitProvider.tsx). Transaction execution uses
 * SolanaPaymentExecutor (see services/transaction/solanaExecutor.ts).
 *
 * This file retains type exports and constants for backward compatibility
 * with useSolanaWallet hook. The SolanaWalletService class is deprecated
 * and will be removed once useSolanaWallet is migrated to AppKit.
 */

// ── Types (kept for compatibility) ──────────────────

export type SolanaNetwork = 'mainnet-beta' | 'testnet' | 'devnet';

export interface SolanaWalletInfo {
  address: string;
  network: SolanaNetwork;
  balance: string;
  provider: string;
}

export enum SolanaConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export enum SolanaWalletEvent {
  CONNECTED = 'solana:connected',
  DISCONNECTED = 'solana:disconnected',
  ACCOUNT_CHANGED = 'solana:accountChanged',
  ERROR = 'solana:error',
}

export interface SolanaTransactionParams {
  to: string;
  amount: string;
  mint?: string;
}

export interface SolanaTransactionResult {
  signature: string;
  from: string;
  to: string;
  amount: string;
  network: SolanaNetwork;
  status: 'pending' | 'confirmed' | 'failed';
  slot?: number;
}

export interface SolanaWalletServiceConfig {
  network: SolanaNetwork;
  autoConnect: boolean;
  rpcEndpoint?: string;
}

export type SolanaEventCallback = (data: unknown) => void;

// ── RPC Endpoints ───────────────────────────────────

import { getSolanaRpcUrl } from '../../config/rpc';

export const SOLANA_RPC_ENDPOINTS: Record<SolanaNetwork, string> = {
  'mainnet-beta': getSolanaRpcUrl(false),
  testnet: 'https://api.testnet.solana.com',
  devnet: getSolanaRpcUrl(true),
};

// ── Deprecated SolanaWalletService ──────────────────
// Retained as a stub to keep useSolanaWallet hook compiling.
// All real wallet interaction should go through AppKit + SolanaPaymentExecutor.

const DEFAULT_CONFIG: SolanaWalletServiceConfig = {
  network: 'mainnet-beta',
  autoConnect: true,
};

class SolanaWalletService {
  private config: SolanaWalletServiceConfig;
  private state: SolanaConnectionState = SolanaConnectionState.DISCONNECTED;
  private walletInfo: SolanaWalletInfo | null = null;
  private eventListeners: Map<SolanaWalletEvent, Set<SolanaEventCallback>> = new Map();

  constructor(config: Partial<SolanaWalletServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    Object.values(SolanaWalletEvent).forEach(event => {
      this.eventListeners.set(event, new Set());
    });
  }

  /** @deprecated Use AppKit connectSolana() instead */
  async connect(): Promise<SolanaWalletInfo | null> {
    console.warn('[SolanaWalletService] Deprecated. Use AppKit connectSolana() instead.');
    return null;
  }

  /** @deprecated Use AppKit disconnect() instead */
  async disconnect(): Promise<void> {
    this.walletInfo = null;
    this.state = SolanaConnectionState.DISCONNECTED;
  }

  on(event: SolanaWalletEvent, callback: SolanaEventCallback): () => void {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.add(callback);
    return () => this.off(event, callback);
  }

  off(event: SolanaWalletEvent, callback: SolanaEventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  getState(): SolanaConnectionState {
    return this.state;
  }

  getWalletInfo(): SolanaWalletInfo | null {
    return this.walletInfo;
  }

  isConnected(): boolean {
    return this.state === SolanaConnectionState.CONNECTED;
  }

  getCurrentAddress(): string | null {
    return this.walletInfo?.address ?? null;
  }

  async refreshBalance(): Promise<string | null> {
    return null;
  }

  getNetwork(): SolanaNetwork {
    return this.config.network;
  }

  setNetwork(network: SolanaNetwork): void {
    this.config.network = network;
    if (this.walletInfo) {
      this.walletInfo.network = network;
    }
  }

  /** @deprecated Use SolanaPaymentExecutor instead */
  async sendTransaction(_params: SolanaTransactionParams): Promise<SolanaTransactionResult | null> {
    console.warn('[SolanaWalletService] sendTransaction deprecated. Use SolanaPaymentExecutor.');
    return null;
  }

  /** @deprecated Use AppKit signMessage via wallet provider */
  async signMessage(_message: string): Promise<string | null> {
    return null;
  }

  async getTokenBalance(_mint: string): Promise<string> {
    return '0';
  }
}

let solanaServiceInstance: SolanaWalletService | null = null;

export function getSolanaWalletService(
  config?: Partial<SolanaWalletServiceConfig>
): SolanaWalletService {
  if (!solanaServiceInstance) {
    solanaServiceInstance = new SolanaWalletService(config);
  }
  return solanaServiceInstance;
}

export function resetSolanaWalletService(): void {
  if (solanaServiceInstance) {
    solanaServiceInstance.disconnect();
    solanaServiceInstance = null;
  }
}

export { SolanaWalletService };
