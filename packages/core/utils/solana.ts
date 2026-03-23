/**
 * Solana utilities
 *
 * Ported from mobazha-mobile/utils/solana.js + services/solanaTransaction.js.
 * Converts backend Go-shaped Solana instructions into @solana/web3.js
 * TransactionInstruction objects and provides transaction confirmation helpers.
 */

import { PublicKey, TransactionInstruction, type Connection } from '@solana/web3.js';

// ── Go backend instruction types ─────────────────────

export interface SolanaGoAccountValue {
  PublicKey: string;
  IsSigner: boolean;
  IsWritable: boolean;
}

export interface SolanaGoInstruction {
  ProgID: string;
  AccountValues: SolanaGoAccountValue[];
  DataBytes: string; // base64 encoded
}

// ── Instruction conversion ───────────────────────────

/**
 * Convert a single Go-shaped Solana instruction into a @solana/web3.js
 * TransactionInstruction. The backend serializes instructions as
 * `{ ProgID, AccountValues, DataBytes(base64) }`.
 */
export function convertSolanaGoInstruction(
  goInstruction: SolanaGoInstruction
): TransactionInstruction {
  const keys = goInstruction.AccountValues.map(account => ({
    pubkey: new PublicKey(account.PublicKey),
    isSigner: account.IsSigner,
    isWritable: account.IsWritable,
  }));

  const data = Buffer.from(goInstruction.DataBytes, 'base64');

  return new TransactionInstruction({
    keys,
    programId: new PublicKey(goInstruction.ProgID),
    data,
  });
}

/**
 * Batch-convert an array of Go instructions.
 */
export function convertSolanaGoInstructions(
  goInstructions: SolanaGoInstruction[]
): TransactionInstruction[] {
  return goInstructions.map(convertSolanaGoInstruction);
}

// ── Validation ───────────────────────────────────────

export function isValidSolanaGoInstructions(data: unknown): data is SolanaGoInstruction[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item: Record<string, unknown>) =>
      typeof item.ProgID === 'string' &&
      Array.isArray(item.AccountValues) &&
      typeof item.DataBytes === 'string'
  );
}

// ── Transaction confirmation ─────────────────────────

export interface ConfirmTransactionOptions {
  maxRetries?: number;
  retryInterval?: number;
}

/**
 * Poll for transaction confirmation using `getSignatureStatus`.
 * Ported from mobazha-mobile/utils/solana.js `confirmTransaction`.
 */
export async function confirmSolanaTransaction(
  connection: Connection,
  signature: string,
  options: ConfirmTransactionOptions = {}
): Promise<unknown> {
  const { maxRetries = 10, retryInterval = 2000 } = options;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: false,
      });

      if (
        status?.value?.confirmationStatus === 'confirmed' ||
        status?.value?.confirmationStatus === 'finalized'
      ) {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, retryInterval));
      retries++;
    } catch {
      await new Promise(resolve => setTimeout(resolve, retryInterval));
      retries++;
    }
  }

  throw new Error('Transaction confirmation timeout');
}

// ── RPC endpoints ────────────────────────────────────

export { getSolanaRpcUrl as getSolanaRpcEndpoint } from '../config/rpc';
