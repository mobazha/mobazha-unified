// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockHostingGet = vi.fn();
const mockHostingPost = vi.fn();
const mockHostingPut = vi.fn();

vi.mock('../../../services/api/helpers', () => ({
  hostingGet: (...args: unknown[]) => mockHostingGet(...args),
  hostingPost: (...args: unknown[]) => mockHostingPost(...args),
  hostingPut: (...args: unknown[]) => mockHostingPut(...args),
}));

describe('collectibles API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes NFT list projection items from hosting', async () => {
    const { listCollectibleNFTs } = await import('../../../services/api/collectibles');
    mockHostingGet.mockResolvedValueOnce({
      items: [
        {
          nft: {
            nftMint: 'mockpnft123',
            hubSlotID: 'slot-1',
            tokenStandard: 'metaplex_pnft',
          },
          slot: {
            hubSlotID: 'slot-1',
            certNumber: 'PSA-10',
            status: 'minted',
          },
          mintTxExplorerURL: 'https://explorer.solana.com/tx/sig-1?cluster=devnet',
        },
      ],
      meta: { total: 1, page: 1, pageSize: 20 },
    });

    const result = await listCollectibleNFTs();

    expect(result.items[0].nftMint).toBe('mockpnft123');
    expect(result.items[0].hubSlot?.certNumber).toBe('PSA-10');
    expect(result.items[0].mintTxExplorerURL).toContain('sig-1');
  });

  it('normalizes NFT detail projection from hosting', async () => {
    const { getCollectibleNFT } = await import('../../../services/api/collectibles');
    mockHostingGet.mockResolvedValueOnce({
      nft: {
        nftMint: 'mockpnft456',
        hubSlotID: 'slot-2',
      },
      slot: {
        hubSlotID: 'slot-2',
        certNumber: 'BGS-9',
        status: 'minted',
      },
    });

    const result = await getCollectibleNFT('mockpnft456');

    expect(result.nftMint).toBe('mockpnft456');
    expect(result.hubSlot?.status).toBe('minted');
  });

  it('creates and proves a wallet ownership challenge before binding', async () => {
    const { createCollectibleWalletChallenge, bindCollectibleWallet } =
      await import('../../../services/api/collectibles');
    mockHostingPost
      .mockResolvedValueOnce({
        challengeID: 'wallet_challenge_1',
        tenantID: 'tenant-1',
        userID: 'user-1',
        wallet: 'holder-wallet',
        nftMint: 'mint-1',
        message: 'Mobazha Collectibles wallet ownership verification',
        expiresAt: '2026-07-04T12:05:00Z',
      })
      .mockResolvedValueOnce({
        tenantID: 'tenant-1',
        userID: 'user-1',
        wallet: 'holder-wallet',
        chain: 'solana',
      });

    const challenge = await createCollectibleWalletChallenge({
      wallet: 'holder-wallet',
      nftMint: 'mint-1',
    });
    await bindCollectibleWallet({
      wallet: 'holder-wallet',
      nftMint: 'mint-1',
      challengeID: challenge.challengeID,
      signature: 'base64-signature',
    });

    expect(mockHostingPost).toHaveBeenNthCalledWith(
      1,
      '/platform/v1/collectibles/wallets/challenges',
      { wallet: 'holder-wallet', nftMint: 'mint-1' }
    );
    expect(mockHostingPost).toHaveBeenNthCalledWith(2, '/platform/v1/collectibles/wallets', {
      wallet: 'holder-wallet',
      nftMint: 'mint-1',
      challengeID: 'wallet_challenge_1',
      signature: 'base64-signature',
    });
  });

  it('requests an unsigned pNFT secondary transfer transaction', async () => {
    const { buildCollectibleTransferTx } = await import('../../../services/api/collectibles');
    mockHostingPost.mockResolvedValueOnce({
      nftMint: 'mint-1',
      holder: 'holder-wallet',
      destination: 'destination-wallet',
      transaction: 'base64-transaction',
      message: 'transfer',
    });

    const result = await buildCollectibleTransferTx(
      'mint-1',
      'holder-wallet',
      'destination-wallet'
    );

    expect(mockHostingPost).toHaveBeenCalledWith(
      '/platform/v1/collectibles/nfts/mint-1/transfer-tx',
      { holder: 'holder-wallet', destination: 'destination-wallet' }
    );
    expect(result.transaction).toBe('base64-transaction');
  });

  it('posts pending mint recovery requests to hosting', async () => {
    const { recoverCollectiblePendingMints } = await import('../../../services/api/collectibles');
    mockHostingPost.mockResolvedValueOnce({
      tenantID: 'tenant-1',
      generatedAt: '2026-06-26T00:00:00Z',
      attempted: 1,
      recovered: 1,
      skipped: 0,
      failed: 0,
      items: [{ hubSlotID: 'slot-1', status: 'recovered' }],
    });

    const result = await recoverCollectiblePendingMints({ limit: 5, royaltyBps: 250 });

    expect(mockHostingPost).toHaveBeenCalledWith(
      '/platform/v1/collectibles/reconcile/recover-mints',
      { limit: 5, royaltyBps: 250 }
    );
    expect(result.recovered).toBe(1);
  });

  it('lists hub redemptions awaiting fulfillment', async () => {
    const { listCollectibleHubRedemptions } = await import('../../../services/api/collectibles');
    mockHostingGet.mockResolvedValueOnce({
      items: [{ redemptionID: 'red-1', status: 'redeem_requested', nftMint: 'mint-1' }],
      meta: { total: 1, page: 1, pageSize: 25 },
    });

    const result = await listCollectibleHubRedemptions({ status: 'redeem_requested' });

    expect(mockHostingGet).toHaveBeenCalledWith(
      '/platform/v1/collectibles/hub/redemptions?page=1&pageSize=20&status=redeem_requested'
    );
    expect(result.items[0].redemptionID).toBe('red-1');
  });

  it('lists primary sale release queue and retries releases', async () => {
    const { listCollectiblePrimarySaleReleaseQueue, retryCollectiblePrimarySaleReleases } =
      await import('../../../services/api/collectibles');
    mockHostingGet.mockResolvedValueOnce({
      items: [{ id: 'ps-1', orderID: 'order-1', releaseStatus: 'failed' }],
      meta: { total: 1, page: 1, pageSize: 25 },
    });
    mockHostingPost.mockResolvedValueOnce({ tenantID: 'tenant-1', limit: 25, released: 1 });

    const queue = await listCollectiblePrimarySaleReleaseQueue({ limit: 25 });
    const retry = await retryCollectiblePrimarySaleReleases({ limit: 25 });

    expect(mockHostingGet).toHaveBeenCalledWith(
      '/platform/v1/collectibles/primary-sales/release-queue?limit=25&retryFailed=true'
    );
    expect(mockHostingPost).toHaveBeenCalledWith(
      '/platform/v1/collectibles/primary-sales/release-retry',
      { limit: 25 }
    );
    expect(queue.items[0].orderID).toBe('order-1');
    expect(retry.released).toBe(1);
  });

  it('submits hub intake and mint/reject slot actions', async () => {
    const { intakeCollectibleHubSlot, mintCollectibleHubSlot, rejectCollectibleHubSlot } =
      await import('../../../services/api/collectibles');
    mockHostingPost
      .mockResolvedValueOnce({ hubSlotID: 'slot-new', certNumber: 'PSA-1', status: 'received' })
      .mockResolvedValueOnce({
        nft: { nftMint: 'mint-1', hubSlotID: 'slot-new', tokenStandard: 'metaplex_pnft' },
        slot: { hubSlotID: 'slot-new', certNumber: 'PSA-1', status: 'minted' },
        mintTxExplorerURL: 'https://explorer.solana.com/tx/sig-mint-1?cluster=devnet',
      })
      .mockResolvedValueOnce({ hubSlotID: 'slot-2', status: 'rejected' });

    const intake = await intakeCollectibleHubSlot({
      certNumber: 'PSA-1',
      grade: '10',
      currentHolder: 'BuyerWallet1111111111111111111111111111',
    });
    const mint = await mintCollectibleHubSlot('slot-new', {
      holder: 'BuyerWallet1111111111111111111111111111',
      royaltyBps: 250,
    });
    const rejected = await rejectCollectibleHubSlot('slot-2');

    expect(mockHostingPost).toHaveBeenNthCalledWith(1, '/platform/v1/collectibles/hub/intake', {
      certNumber: 'PSA-1',
      grade: '10',
      currentHolder: 'BuyerWallet1111111111111111111111111111',
    });
    expect(mockHostingPost).toHaveBeenNthCalledWith(
      2,
      '/platform/v1/collectibles/hub/slots/slot-new/mint',
      {
        holder: 'BuyerWallet1111111111111111111111111111',
        royaltyBps: 250,
      }
    );
    expect(mockHostingPost).toHaveBeenNthCalledWith(
      3,
      '/platform/v1/collectibles/hub/slots/slot-2/reject',
      {}
    );
    expect(intake.hubSlotID).toBe('slot-new');
    expect(mint.nftMint).toBe('mint-1');
    expect(mint.hubSlot?.status).toBe('minted');
    expect(mint.mintTxExplorerURL).toContain('sig-mint-1');
    expect(rejected.status).toBe('rejected');
  });

  it('lists and submits seller-scoped source deposits', async () => {
    const { listMyCollectibleSourceDeposits, submitMyCollectibleSourceDeposit } =
      await import('../../../services/api/collectibles');
    mockHostingGet.mockResolvedValueOnce({
      items: [{ sourceDepositID: 'dep-1', certNumber: 'PSA-1', status: 'submitted' }],
      meta: { total: 1, page: 1, pageSize: 20 },
    });
    mockHostingPost.mockResolvedValueOnce({
      sourceDepositID: 'dep-2',
      certNumber: 'PSA-2',
      status: 'submitted',
    });

    const listed = await listMyCollectibleSourceDeposits({ status: 'submitted' });
    const created = await submitMyCollectibleSourceDeposit({
      certNumber: 'PSA-2',
      holderWallet: 'Holder11111111111111111111111111111111',
      grade: '10',
    });

    expect(mockHostingGet).toHaveBeenCalledWith(
      '/platform/v1/collectibles/my/source-deposits?status=submitted&page=1&pageSize=20'
    );
    expect(mockHostingPost).toHaveBeenCalledWith('/platform/v1/collectibles/my/source-deposits', {
      certNumber: 'PSA-2',
      holderWallet: 'Holder11111111111111111111111111111111',
      grade: '10',
    });
    expect(listed.items[0].sourceDepositID).toBe('dep-1');
    expect(created.sourceDepositID).toBe('dep-2');
  });

  it('ships seller-scoped source deposits with tracking number', async () => {
    const { shipMyCollectibleSourceDeposit } = await import('../../../services/api/collectibles');
    mockHostingPut.mockResolvedValueOnce({
      sourceDepositID: 'dep-redeem',
      status: 'shipped',
      trackingNo: 'TRK-123',
    });

    const shipped = await shipMyCollectibleSourceDeposit('dep-redeem', {
      trackingNo: 'TRK-123',
    });

    expect(mockHostingPut).toHaveBeenCalledWith(
      '/platform/v1/collectibles/my/source-deposits/dep-redeem/ship',
      { trackingNo: 'TRK-123' }
    );
    expect(shipped.status).toBe('shipped');
    expect(shipped.trackingNo).toBe('TRK-123');
  });

  it('approves and rejects operator source deposits', async () => {
    const { approveCollectibleSourceDeposit, rejectCollectibleSourceDeposit } =
      await import('../../../services/api/collectibles');
    mockHostingPut
      .mockResolvedValueOnce({ sourceDepositID: 'dep-1', status: 'source_held' })
      .mockResolvedValueOnce({ sourceDepositID: 'dep-2', status: 'rejected' });

    const approved = await approveCollectibleSourceDeposit('dep-1');
    const rejected = await rejectCollectibleSourceDeposit('dep-2', {
      reason: 'Photos unclear',
    });

    expect(mockHostingPut).toHaveBeenNthCalledWith(
      1,
      '/platform/v1/collectibles/source-deposits/dep-1/approve',
      {}
    );
    expect(mockHostingPut).toHaveBeenNthCalledWith(
      2,
      '/platform/v1/collectibles/source-deposits/dep-2/reject',
      { reason: 'Photos unclear' }
    );
    expect(approved.status).toBe('source_held');
    expect(rejected.status).toBe('rejected');
  });
});
