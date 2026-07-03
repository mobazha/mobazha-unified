// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { Connection } from '@solana/web3.js';
import { describe, expect, it, vi } from 'vitest';
import {
  deriveMockBurnSignature,
  deriveMockBurnSignatureFromTransaction,
  deriveMockBurnTransaction,
  isMockCollectibleBurnTransaction,
  MIN_SOL_LAMPORTS_FOR_BURN_FEE,
  MOCK_BURN_SIG_PREFIX,
  MOCK_BURN_TX_PREFIX,
  signCollectibleBurnTransaction,
} from '../../collectibles/burnTx';
import type { CollectibleBurnTx } from '../../collectibles/types';

describe('isMockCollectibleBurnTransaction', () => {
  it('detects mock burn payloads', () => {
    expect(isMockCollectibleBurnTransaction(`${MOCK_BURN_TX_PREFIX}abc123`)).toBe(true);
    expect(isMockCollectibleBurnTransaction('  mock-burn-tx-deadbeef')).toBe(true);
  });

  it('rejects real serialized payloads', () => {
    expect(
      isMockCollectibleBurnTransaction('AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==')
    ).toBe(false);
  });
});

describe('signCollectibleBurnTransaction', () => {
  const solanaWalletAddress = 'So11111111111111111111111111111111111111112';
  const mockBurnTx: CollectibleBurnTx = {
    nftMint: 'mint-1',
    holder: 'Holder1111111111111111111111111111111111',
    transaction: `${MOCK_BURN_TX_PREFIX}deadbeef`,
    message: 'mock',
  };

  it('returns mock burn signature without wallet provider', async () => {
    const signature = await signCollectibleBurnTransaction({
      burnTx: mockBurnTx,
      walletProvider: null,
      walletAddress: 'Holder1111111111111111111111111111111111',
    });
    expect(signature).toMatch(new RegExp(`^${MOCK_BURN_SIG_PREFIX}`));
    expect(signature).not.toBe(mockBurnTx.transaction);
    expect(signature).toBe(await deriveMockBurnSignatureFromTransaction(mockBurnTx.transaction));
  });

  it('requires wallet provider for non-mock payloads', async () => {
    const burnTx: CollectibleBurnTx = {
      nftMint: 'mint-1',
      holder: 'Holder1111111111111111111111111111111111',
      transaction: 'not-a-valid-tx',
      message: 'real',
    };

    await expect(
      signCollectibleBurnTransaction({
        burnTx,
        walletProvider: null,
        walletAddress: 'Holder1111111111111111111111111111111111',
      })
    ).rejects.toThrow(/wallet provider/i);
  });

  it('rejects empty transaction payload', async () => {
    await expect(
      signCollectibleBurnTransaction({
        burnTx: { nftMint: 'mint-1', holder: 'x', transaction: '  ', message: '' },
        walletProvider: null,
        walletAddress: 'Holder1111111111111111111111111111111111',
      })
    ).rejects.toThrow(/missing/i);
  });

  it('preflights real burn transactions before wallet signing', async () => {
    const connection = createBurnConnectionMock({
      balance: MIN_SOL_LAMPORTS_FOR_BURN_FEE,
    });
    const walletProvider = {
      signAndSendTransaction: vi.fn().mockResolvedValue('burn-signature'),
    };

    const signature = await signCollectibleBurnTransaction({
      burnTx: realBurnTx(),
      walletProvider,
      walletAddress: solanaWalletAddress,
      connection,
    });

    expect(signature).toBe('burn-signature');
    expect(connection.getBalance).toHaveBeenCalled();
    expect(connection.simulateTransaction).toHaveBeenCalled();
    expect(walletProvider.signAndSendTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects real burns when fee-payer SOL balance is too low', async () => {
    const connection = createBurnConnectionMock({ balance: 0 });
    const walletProvider = {
      signAndSendTransaction: vi.fn().mockResolvedValue('burn-signature'),
    };

    await expect(
      signCollectibleBurnTransaction({
        burnTx: realBurnTx(),
        walletProvider,
        walletAddress: solanaWalletAddress,
        connection,
      })
    ).rejects.toThrow(/insufficient sol balance/i);

    expect(connection.simulateTransaction).not.toHaveBeenCalled();
    expect(walletProvider.signAndSendTransaction).not.toHaveBeenCalled();
  });

  it('rejects real burns when simulation fails', async () => {
    const connection = createBurnConnectionMock({
      balance: MIN_SOL_LAMPORTS_FOR_BURN_FEE,
      simulationError: { InstructionError: [0, 'Custom'] },
    });
    const walletProvider = {
      signAndSendTransaction: vi.fn().mockResolvedValue('burn-signature'),
    };

    await expect(
      signCollectibleBurnTransaction({
        burnTx: realBurnTx(),
        walletProvider,
        walletAddress: solanaWalletAddress,
        connection,
      })
    ).rejects.toThrow(/simulation failed/i);

    expect(walletProvider.signAndSendTransaction).not.toHaveBeenCalled();
  });
});

describe('deriveMockBurnSignature', () => {
  it('matches hosting mock burn tx and signature binding', async () => {
    const mint = 'mint-abc';
    const holder = 'Holder1111111111111111111111111111111111';
    const tx = await deriveMockBurnTransaction(mint, holder);
    expect(tx.startsWith(MOCK_BURN_TX_PREFIX)).toBe(true);
    const sig = await deriveMockBurnSignature(mint, holder);
    expect(sig.startsWith(MOCK_BURN_SIG_PREFIX)).toBe(true);
    expect(sig).not.toBe(tx);
  });
});

function realBurnTx(): CollectibleBurnTx {
  return {
    nftMint: 'mint-1',
    holder: 'holder-1',
    transaction: '[]',
    message: 'real',
  };
}

function createBurnConnectionMock(options: {
  balance: number;
  simulationError?: unknown;
}): Connection {
  return {
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: '11111111111111111111111111111111',
    }),
    getBalance: vi.fn().mockResolvedValue(options.balance),
    simulateTransaction: vi.fn().mockResolvedValue({
      value: {
        err: options.simulationError ?? null,
        logs: options.simulationError ? ['burn failed'] : [],
      },
    }),
    getSignatureStatus: vi.fn().mockResolvedValue({
      value: { confirmationStatus: 'confirmed' },
    }),
  } as unknown as Connection;
}
