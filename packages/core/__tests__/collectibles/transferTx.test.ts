// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { signCollectibleTransferTransaction } from '../../collectibles/transferTx';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');
const SYSVAR_INSTRUCTIONS_PROGRAM_ID = new PublicKey('Sysvar1nstructions1111111111111111111111111');
const textSeed = (value: string) => new TextEncoder().encode(value);

function transferAccounts(holder: PublicKey, destination: PublicKey, mint: PublicKey) {
  const metadata = PublicKey.findProgramAddressSync(
    [textSeed('metadata'), TOKEN_METADATA_PROGRAM_ID.toBytes(), mint.toBytes()],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
  const edition = PublicKey.findProgramAddressSync(
    [
      textSeed('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBytes(),
      mint.toBytes(),
      textSeed('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
  const sourceToken = PublicKey.findProgramAddressSync(
    [holder.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
  const destinationToken = PublicKey.findProgramAddressSync(
    [destination.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
  const tokenRecord = (token: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [
        textSeed('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBytes(),
        mint.toBytes(),
        textSeed('token_record'),
        token.toBytes(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
  return [
    { pubkey: sourceToken, isSigner: false, isWritable: true },
    { pubkey: holder, isSigner: false, isWritable: false },
    { pubkey: destinationToken, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: metadata, isSigner: false, isWritable: true },
    { pubkey: edition, isSigner: false, isWritable: false },
    { pubkey: tokenRecord(sourceToken), isSigner: false, isWritable: true },
    { pubkey: tokenRecord(destinationToken), isSigner: false, isWritable: true },
    { pubkey: holder, isSigner: true, isWritable: false },
    { pubkey: holder, isSigner: true, isWritable: true },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_INSTRUCTIONS_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
}

function transferPayload(
  holder: PublicKey,
  destination: PublicKey,
  mint: PublicKey,
  accounts = transferAccounts(holder, destination, mint)
): string {
  const transaction = new Transaction({
    feePayer: holder,
    recentBlockhash: SYSTEM_PROGRAM_ID.toBase58(),
  }).add(
    new TransactionInstruction({
      programId: TOKEN_METADATA_PROGRAM_ID,
      keys: accounts,
      data: Buffer.from([49, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
    })
  );
  return transaction
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString('base64');
}

describe('signCollectibleTransferTransaction', () => {
  it('rejects an empty transaction payload', async () => {
    await expect(
      signCollectibleTransferTransaction({
        transferTx: {
          nftMint: 'mint',
          holder: 'holder',
          destination: 'destination',
          transaction: '',
          message: '',
        },
        walletProvider: null,
        walletAddress: 'holder',
        expectedNFTMint: 'mint',
        expectedDestination: 'destination',
      })
    ).rejects.toThrow(/payload is missing/i);
  });

  it('fails before RPC work when a real transfer has no wallet signer', async () => {
    const connection = { getBalance: vi.fn() };
    await expect(
      signCollectibleTransferTransaction({
        transferTx: {
          nftMint: 'mint',
          holder: 'holder',
          destination: 'destination',
          transaction: 'AQID',
          message: 'transfer',
        },
        walletProvider: null,
        walletAddress: 'holder',
        expectedNFTMint: 'mint',
        expectedDestination: 'destination',
        connection: connection as never,
      })
    ).rejects.toThrow(/wallet provider/i);
    expect(connection.getBalance).not.toHaveBeenCalled();
  });

  it('rejects a valid Solana transaction that is not a Metaplex TransferV1', async () => {
    const holder = '4FKqynd2ufgjkmZqMm7i1UDmshXY7XWCyrzaF9QZ9Whn';
    const destination = '7F597THT3svzJfejpSWcbTcaq2zhxApquivqaPh3dTgC';
    const mint = '2oR7yFixWVNPRaahf6bKpVhrpKx1p9k9aWNQ9wG4Mq8L';
    const systemTransfer =
      'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDMD5/5p7EJh2+BR5vLxS1Whf31ZNfdaccAUFpJD/irvFcwO8PVZCeEeLio4vGRpBpbdn2AjFOqtHlNtUWPf+BSQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgIAAQA=';
    const connection = { getBalance: vi.fn() };

    await expect(
      signCollectibleTransferTransaction({
        transferTx: {
          nftMint: mint,
          holder,
          destination,
          transaction: systemTransfer,
          message: 'malicious transfer',
        },
        walletProvider: { signTransaction: vi.fn() },
        walletAddress: holder,
        expectedNFTMint: mint,
        expectedDestination: destination,
        connection: connection as never,
      })
    ).rejects.toThrow(/transfer program/i);
    expect(connection.getBalance).not.toHaveBeenCalled();
  });

  it('accepts only the exact derived TransferV1 account layout', async () => {
    const holder = new PublicKey('4FKqynd2ufgjkmZqMm7i1UDmshXY7XWCyrzaF9QZ9Whn');
    const destination = new PublicKey('7F597THT3svzJfejpSWcbTcaq2zhxApquivqaPh3dTgC');
    const mint = new PublicKey('2oR7yFixWVNPRaahf6bKpVhrpKx1p9k9aWNQ9wG4Mq8L');
    const connection = { getBalance: vi.fn().mockResolvedValue(0) };

    await expect(
      signCollectibleTransferTransaction({
        transferTx: {
          nftMint: mint.toBase58(),
          holder: holder.toBase58(),
          destination: destination.toBase58(),
          transaction: transferPayload(holder, destination, mint),
          message: 'transfer',
        },
        walletProvider: { signTransaction: vi.fn() },
        walletAddress: holder.toBase58(),
        expectedNFTMint: mint.toBase58(),
        expectedDestination: destination.toBase58(),
        connection: connection as never,
      })
    ).rejects.toThrow(/insufficient SOL balance/i);
    expect(connection.getBalance).toHaveBeenCalledOnce();
  });

  it('rejects expected accounts hidden in unused positions of another transfer', async () => {
    const holder = new PublicKey('4FKqynd2ufgjkmZqMm7i1UDmshXY7XWCyrzaF9QZ9Whn');
    const expectedDestination = new PublicKey('7F597THT3svzJfejpSWcbTcaq2zhxApquivqaPh3dTgC');
    const expectedMint = new PublicKey('2oR7yFixWVNPRaahf6bKpVhrpKx1p9k9aWNQ9wG4Mq8L');
    const actualDestination = new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVMf7NzePse2RQeZcdM7');
    const actualMint = new PublicKey('So11111111111111111111111111111111111111112');
    const maliciousAccounts = [
      ...transferAccounts(holder, actualDestination, actualMint),
      { pubkey: expectedDestination, isSigner: false, isWritable: false },
      { pubkey: expectedMint, isSigner: false, isWritable: false },
    ];
    const connection = { getBalance: vi.fn() };

    await expect(
      signCollectibleTransferTransaction({
        transferTx: {
          nftMint: expectedMint.toBase58(),
          holder: holder.toBase58(),
          destination: expectedDestination.toBase58(),
          transaction: transferPayload(holder, actualDestination, actualMint, maliciousAccounts),
          message: 'malicious transfer',
        },
        walletProvider: { signTransaction: vi.fn() },
        walletAddress: holder.toBase58(),
        expectedNFTMint: expectedMint.toBase58(),
        expectedDestination: expectedDestination.toBase58(),
        connection: connection as never,
      })
    ).rejects.toThrow(/TransferV1 collectible transaction/i);
    expect(connection.getBalance).not.toHaveBeenCalled();
  });
});
