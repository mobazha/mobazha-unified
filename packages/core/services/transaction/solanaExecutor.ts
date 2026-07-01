/**
 * Solana Payment Executor
 *
 * Implements ChainPaymentExecutor for Solana chains.
 * Ported from mobazha-mobile/services/solanaTransaction.js —
 * converts backend Go-shaped instructions to @solana/web3.js transactions,
 * signs via the wallet provider (AppKit Solana adapter), and confirms.
 */

import { Connection, PublicKey, Transaction, type TransactionSignature } from '@solana/web3.js';

import type {
  ChainPaymentExecutor,
  ChainCategory,
  TxExecutionResult,
  ContractPaymentDetails,
} from './types';

import {
  convertSolanaGoInstructions,
  confirmSolanaTransaction,
  isValidSolanaGoInstructions,
  getSolanaRpcEndpoint,
  type SolanaGoInstruction,
} from '../../utils/solana';

// ── Wallet provider interface (subset of AppKit Solana provider) ──

interface SolanaWalletProvider {
  signAndSendTransaction(
    transaction: Transaction
  ): Promise<TransactionSignature | { signature: string }>;
}

// ── Initialize params ────────────────────────────────

export interface SolanaExecutorInitParams {
  /** Solana JSON-RPC connection (or RPC URL string) */
  connection?: Connection | string;
  /** Wallet provider obtained from AppKit */
  walletProvider: SolanaWalletProvider;
  /** Wallet public key (base58 string) */
  walletAddress: string;
  /** Whether this is devnet (default: auto-detect from connection) */
  isDevnet?: boolean;
}

// ── Solana Payment Executor ─────────────────────────

export class SolanaPaymentExecutor implements ChainPaymentExecutor {
  readonly category: ChainCategory = 'solana';

  private connection: Connection | null = null;
  private walletProvider: SolanaWalletProvider | null = null;
  private walletAddress: string | null = null;

  async initialize(params: unknown): Promise<boolean> {
    const p = params as SolanaExecutorInitParams;
    if (!p?.walletProvider || !p?.walletAddress) {
      console.warn('[SolanaPaymentExecutor] Missing walletProvider or walletAddress');
      return false;
    }

    this.walletProvider = p.walletProvider;
    this.walletAddress = p.walletAddress;

    if (p.connection instanceof Connection) {
      this.connection = p.connection;
    } else if (typeof p.connection === 'string') {
      this.connection = new Connection(p.connection, 'confirmed');
    } else {
      const rpcUrl = getSolanaRpcEndpoint(p.isDevnet ?? false);
      this.connection = new Connection(rpcUrl, 'confirmed');
    }

    return true;
  }

  async executeTransaction(instructions: unknown): Promise<TxExecutionResult> {
    if (!this.connection || !this.walletProvider || !this.walletAddress) {
      return { success: false, error: 'Solana executor not initialized. Call initialize() first.' };
    }

    if (!isValidSolanaGoInstructions(instructions)) {
      return { success: false, error: 'Invalid Solana instructions format' };
    }

    try {
      const goInstructions = instructions as SolanaGoInstruction[];
      const txInstructions = convertSolanaGoInstructions(goInstructions);

      const transaction = new Transaction();
      txInstructions.forEach(ix => transaction.add(ix));

      const wallet = new PublicKey(this.walletAddress);
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet;

      const simulation = await this.connection.simulateTransaction(transaction);
      if (simulation.value.err) {
        const errMsg = JSON.stringify(simulation.value.err);
        const logs = simulation.value.logs?.join('\n') ?? '';
        return {
          success: false,
          error: `Transaction simulation failed: ${errMsg}\n${logs}`,
        };
      }

      const balance = await this.connection.getBalance(wallet);
      if (balance < 5000) {
        return { success: false, error: 'Insufficient SOL balance for transaction fees' };
      }

      const result = await this.walletProvider.signAndSendTransaction(transaction);
      const signature = typeof result === 'string' ? result : result.signature;

      await confirmSolanaTransaction(this.connection, signature, {
        maxRetries: 10,
        retryInterval: 2000,
      });

      const status = await this.connection.getSignatureStatus(signature);
      if (status.value?.err) {
        return {
          success: false,
          transactionHash: signature,
          error: `Transaction failed on-chain: ${JSON.stringify(status.value.err)}`,
        };
      }

      return {
        success: true,
        transactionHash: signature,
        blockNumber: status.value?.slot ?? undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Solana transaction failed: ${message}` };
    }
  }

  async executeContractPayment(
    instructions: unknown,
    _details?: ContractPaymentDetails
  ): Promise<TxExecutionResult> {
    return this.executeTransaction(instructions);
  }

  isReady(): boolean {
    return !!(this.connection && this.walletProvider && this.walletAddress);
  }

  cleanup(): void {
    this.connection = null;
    this.walletProvider = null;
    this.walletAddress = null;
  }
}
