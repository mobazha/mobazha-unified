// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getEnvConfig } from '../config/env';
import { confirmSolanaTransaction, getSolanaRpcEndpoint } from '../utils/solana';
import type { CollectibleTransferTx } from './types';
import type { CollectibleBurnWalletProvider } from './burnTx';
import { MIN_SOL_LAMPORTS_FOR_BURN_FEE } from './burnTx';

export interface SignCollectibleTransferTxParams {
  transferTx: CollectibleTransferTx;
  walletProvider: CollectibleBurnWalletProvider | null | undefined;
  walletAddress: string;
  expectedNFTMint: string;
  expectedDestination: string;
  isDevnet?: boolean;
  connection?: Connection;
}

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export async function signCollectibleTransferTransaction(
  params: SignCollectibleTransferTxParams
): Promise<string> {
  const payload = params.transferTx.transaction?.trim() ?? '';
  if (!payload) throw new Error('Transfer transaction payload is missing');
  if (!params.walletProvider) throw new Error('Solana wallet provider is not available');

  const connection =
    params.connection ??
    new Connection(getSolanaRpcEndpoint(params.isDevnet ?? getEnvConfig().isTestEnv), 'confirmed');
  const transaction = decodeTransferTransaction(payload);
  const wallet = new PublicKey(params.walletAddress);
  validateTransferTransaction(transaction, params);
  const balance = await connection.getBalance(wallet, 'confirmed');
  if (balance < MIN_SOL_LAMPORTS_FOR_BURN_FEE) {
    throw new Error('Insufficient SOL balance for transfer transaction fees');
  }
  const simulation =
    transaction instanceof VersionedTransaction
      ? await connection.simulateTransaction(transaction, { commitment: 'confirmed' })
      : await connection.simulateTransaction(transaction);
  if (simulation.value.err) {
    throw new Error(
      `Transfer transaction simulation failed: ${JSON.stringify(simulation.value.err)}`
    );
  }

  let signature: string;
  if (params.walletProvider.signAndSendTransaction) {
    const result = await params.walletProvider.signAndSendTransaction(transaction);
    signature = typeof result === 'string' ? result : result.signature;
  } else if (params.walletProvider.signTransaction) {
    const signed = await params.walletProvider.signTransaction(transaction);
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

function validateTransferTransaction(
  transaction: Transaction | VersionedTransaction,
  params: SignCollectibleTransferTxParams
): void {
  const wallet = new PublicKey(params.walletAddress);
  const mint = new PublicKey(params.expectedNFTMint);
  const destination = new PublicKey(params.expectedDestination);
  if (
    params.transferTx.holder !== wallet.toBase58() ||
    params.transferTx.nftMint !== mint.toBase58() ||
    params.transferTx.destination !== destination.toBase58()
  ) {
    throw new Error('Transfer transaction does not match the requested collectible transfer');
  }
  if (transaction instanceof VersionedTransaction) {
    throw new Error('Unsupported versioned collectible transfer transaction');
  }
  if (!transaction.feePayer?.equals(wallet) || transaction.instructions.length !== 1) {
    throw new Error('Invalid collectible transfer transaction layout');
  }
  const instruction = transaction.instructions[0];
  if (!instruction || !instruction.programId.equals(TOKEN_METADATA_PROGRAM_ID)) {
    throw new Error('Invalid collectible transfer program');
  }
  const account = (key: PublicKey) => instruction.keys.find(meta => meta.pubkey.equals(key));
  const holderAccount = account(wallet);
  const destinationAccount = account(destination);
  const mintAccount = account(mint);
  if (
    !holderAccount?.isSigner ||
    destinationAccount?.isSigner ||
    !destinationAccount ||
    !mintAccount ||
    instruction.data.length !== 11 ||
    instruction.data[0] !== 49 ||
    instruction.data[1] !== 0 ||
    instruction.data[2] !== 1 ||
    instruction.data.subarray(3, 10).some(byte => byte !== 0) ||
    instruction.data[10] !== 0
  ) {
    throw new Error('Invalid Metaplex TransferV1 collectible transaction');
  }
}

function decodeTransferTransaction(payload: string): Transaction | VersionedTransaction {
  const bytes =
    typeof Buffer !== 'undefined'
      ? Uint8Array.from(Buffer.from(payload, 'base64'))
      : Uint8Array.from(atob(payload), char => char.charCodeAt(0));
  try {
    return Transaction.from(bytes);
  } catch {
    return VersionedTransaction.deserialize(bytes);
  }
}
