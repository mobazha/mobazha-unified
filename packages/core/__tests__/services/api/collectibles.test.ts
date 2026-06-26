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
        },
      ],
      meta: { total: 1, page: 1, pageSize: 20 },
    });

    const result = await listCollectibleNFTs();

    expect(result.items[0].nftMint).toBe('mockpnft123');
    expect(result.items[0].hubSlot?.certNumber).toBe('PSA-10');
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
});
