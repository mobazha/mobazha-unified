// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';
import { signCollectibleTransferTransaction } from '../../collectibles/transferTx';

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
});
