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
});
