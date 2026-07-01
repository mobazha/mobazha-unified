/**
 * Collectible NFT burn transaction signing (client-side).
 *
 * Mock/dev: backend returns `mock-burn-tx-*`; client derives `mock-burn-sig-*` as burn proof.
 * Production: base64 serialized tx or Go-shaped JSON instructions → wallet sign + confirm.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  type TransactionSignature,
} from '@solana/web3.js';

import { getEnvConfig } from '../config/env';
import {
  confirmSolanaTransaction,
  convertSolanaGoInstructions,
  getSolanaRpcEndpoint,
  isValidSolanaGoInstructions,
} from '../utils/solana';
import type { CollectibleBurnTx } from './types';

export const MOCK_BURN_TX_PREFIX = 'mock-burn-tx-';
export const MOCK_BURN_SIG_PREFIX = 'mock-burn-sig-';
export const MIN_SOL_LAMPORTS_FOR_BURN_FEE = 5000;

export function isMockCollectibleBurnTransaction(transaction: string): boolean {
  return transaction.trim().startsWith(MOCK_BURN_TX_PREFIX);
}

/** Mirrors hosting `nft.MockBurnTransaction` for local demo / E2E alignment. */
export async function deriveMockBurnTransaction(nftMint: string, holder: string): Promise<string> {
  const mint = nftMint.trim();
  const wallet = holder.trim();
  if (!mint || !wallet) {
    return '';
  }
  const digest = await sha256HexPrefix(`burn:${mint}:${wallet}`, 32);
  return `${MOCK_BURN_TX_PREFIX}${digest}`;
}

/** Mirrors hosting `nft.MockBurnSignature` — mock provider burn proof, not the unsigned tx. */
export async function deriveMockBurnSignature(nftMint: string, holder: string): Promise<string> {
  const tx = await deriveMockBurnTransaction(nftMint, holder);
  return deriveMockBurnSignatureFromTransaction(tx);
}

export async function deriveMockBurnSignatureFromTransaction(transaction: string): Promise<string> {
  const tx = transaction.trim();
  if (!tx) {
    return '';
  }
  const digest = await sha256HexPrefix(`mock-burn-signature:${tx}`, 32);
  return `${MOCK_BURN_SIG_PREFIX}${digest}`;
}

async function sha256HexPrefix(input: string, hexLen: number): Promise<string> {
  const data = new TextEncoder().encode(input);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API is unavailable');
  }
  const hash = await subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, hexLen);
}

/** Subset of AppKit Solana wallet provider used for burn redemption. */
export interface CollectibleBurnWalletProvider {
  signAndSendTransaction?(
    transaction: Transaction | VersionedTransaction
  ): Promise<TransactionSignature | { signature: string }>;
  signTransaction?(
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction>;
}

/** Narrow a generic injected wallet to the Solana signing capability required for redemption. */
export function isCollectibleBurnWalletProvider(
  provider: unknown
): provider is CollectibleBurnWalletProvider {
  if (!provider || typeof provider !== 'object') return false;
  const candidate = provider as Record<string, unknown>;
  return (
    typeof candidate.signAndSendTransaction === 'function' ||
    typeof candidate.signTransaction === 'function'
  );
}

export interface SignCollectibleBurnTxParams {
  burnTx: CollectibleBurnTx;
  walletProvider: CollectibleBurnWalletProvider | null | undefined;
  walletAddress: string;
  /** Defaults to `getEnvConfig().isTestEnv` when omitted. */
  isDevnet?: boolean;
  connection?: Connection;
}

export async function signCollectibleBurnTransaction(
  params: SignCollectibleBurnTxParams
): Promise<string> {
  const txPayload = params.burnTx.transaction?.trim() ?? '';
  if (!txPayload) {
    throw new Error('Burn transaction payload is missing');
  }

  if (isMockCollectibleBurnTransaction(txPayload)) {
    return deriveMockBurnSignatureFromTransaction(txPayload);
  }

  const provider = params.walletProvider;
  if (!provider) {
    throw new Error('Solana wallet provider is not available');
  }

  const isDevnet = params.isDevnet ?? getEnvConfig().isTestEnv;
  const connection =
    params.connection ?? new Connection(getSolanaRpcEndpoint(isDevnet), 'confirmed');

  const transaction = await prepareBurnTransaction(txPayload, connection, params.walletAddress);
  await preflightBurnTransaction(transaction, connection, params.walletAddress);

  let signature: string;
  if (provider.signAndSendTransaction) {
    const result = await provider.signAndSendTransaction(transaction);
    signature = typeof result === 'string' ? result : result.signature;
  } else if (provider.signTransaction) {
    const signed = await provider.signTransaction(transaction);
    signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
  } else {
    throw new Error('Wallet does not support signing Solana transactions');
  }

  await confirmSolanaTransaction(connection, signature);
  return signature;
}

async function prepareBurnTransaction(
  payload: string,
  connection: Connection,
  walletAddress: string
): Promise<Transaction | VersionedTransaction> {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (isValidSolanaGoInstructions(parsed)) {
      const transaction = new Transaction();
      convertSolanaGoInstructions(parsed).forEach(ix => transaction.add(ix));

      const wallet = new PublicKey(walletAddress);
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet;
      return transaction;
    }
  } catch {
    // Not JSON instructions — fall through to serialized tx bytes.
  }

  const bytes = decodeBase64Payload(payload);

  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

async function preflightBurnTransaction(
  transaction: Transaction | VersionedTransaction,
  connection: Connection,
  walletAddress: string
): Promise<void> {
  const wallet = new PublicKey(walletAddress);
  const balance = await connection.getBalance(wallet, 'confirmed');
  if (balance < MIN_SOL_LAMPORTS_FOR_BURN_FEE) {
    throw new Error('Insufficient SOL balance for burn transaction fees');
  }

  const simulation =
    transaction instanceof VersionedTransaction
      ? await connection.simulateTransaction(transaction, { commitment: 'confirmed' })
      : await connection.simulateTransaction(transaction);
  if (simulation.value.err) {
    const detail = JSON.stringify(simulation.value.err);
    const logs = simulation.value.logs?.join('\n');
    throw new Error(`Burn transaction simulation failed: ${detail}${logs ? `\n${logs}` : ''}`);
  }
}

function decodeBase64Payload(payload: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(payload, 'base64'));
  }
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
