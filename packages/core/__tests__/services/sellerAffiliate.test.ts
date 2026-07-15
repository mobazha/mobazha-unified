import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api/helpers', () => ({
  crossStoreAnonymousGet: vi.fn(),
  crossStoreAnonymousPost: vi.fn(),
  nodeAuthGet: vi.fn(),
  nodeAuthPost: vi.fn(),
  nodeAuthPut: vi.fn(),
}));

import {
  createSellerAffiliateLink,
  createSellerAffiliateReferralSession,
  getPublicSellerAffiliateLink,
  getPublicSellerAffiliateProgram,
  getSellerAffiliateCapabilities,
  getSellerAffiliateProgram,
  listSellerAffiliateLinks,
  listSellerAffiliateStatements,
  putSellerAffiliateProgram,
  reissueSellerAffiliateLink,
  revokeSellerAffiliateLink,
} from '../../services/api/sellerAffiliate';
import {
  crossStoreAnonymousGet,
  crossStoreAnonymousPost,
  nodeAuthGet,
  nodeAuthPost,
  nodeAuthPut,
} from '../../services/api/helpers';

const program = {
  id: 'program-1',
  sellerPeerID: 'seller-peer',
  status: 'active',
  commissionRateBPS: 500,
  attributionWindowSeconds: 2_592_000,
  createdAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
};

const publicProgram = {
  programID: 'program-1',
  sellerPeerID: 'seller-peer',
  status: 'active',
  commissionRateBPS: 500,
  attributionWindowSeconds: 2_592_000,
};

const link = {
  id: 'link-1',
  programID: 'program-1',
  promoterPeerID: 'promoter-peer',
  publicToken: 'token-1',
  publicPath: '/v1/public/seller-affiliate-links/token-1',
  status: 'active',
  createdAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
};

describe('seller Affiliate API routing', () => {
  beforeEach(() => {
    vi.mocked(crossStoreAnonymousGet).mockReset();
    vi.mocked(crossStoreAnonymousPost).mockReset();
    vi.mocked(nodeAuthGet).mockReset();
    vi.mocked(nodeAuthPost).mockReset();
    vi.mocked(nodeAuthPut).mockReset();
  });

  it('discovers a program and enrolls a promoter by Peer evidence without account routing', async () => {
    const evidence = { domain: 'mobazha:seller-affiliate-promoter-enrollment:v1' };
    vi.mocked(crossStoreAnonymousGet).mockResolvedValue(publicProgram);
    vi.mocked(nodeAuthPost).mockResolvedValue(evidence);
    vi.mocked(crossStoreAnonymousPost).mockResolvedValue(link);

    await getPublicSellerAffiliateProgram('seller-peer');
    await createSellerAffiliateLink('seller-peer', 'program-1');

    expect(crossStoreAnonymousGet).toHaveBeenCalledWith(
      '/public/seller-affiliate/program',
      'seller-peer'
    );
    expect(nodeAuthPost).toHaveBeenCalledWith('/seller-affiliate/promoter-enrollments', {
      sellerPeerID: 'seller-peer',
      programID: 'program-1',
    });
    expect(crossStoreAnonymousPost).toHaveBeenCalledWith(
      '/public/seller-affiliate/programs/program-1/links',
      'seller-peer',
      { evidence }
    );
  });

  it('resolves public links and referral sessions against the selected seller Peer', async () => {
    vi.mocked(crossStoreAnonymousGet).mockResolvedValue(publicProgram);
    vi.mocked(crossStoreAnonymousPost).mockResolvedValue({
      referralSessionID: 'session-1',
      sellerPeerID: 'seller-peer',
      expiresAt: '2026-07-16T00:00:00Z',
    });

    await getPublicSellerAffiliateLink('seller-peer', 'token-1');
    await createSellerAffiliateReferralSession('seller-peer', 'token-1');

    expect(crossStoreAnonymousGet).toHaveBeenCalledWith(
      '/public/seller-affiliate-links/token-1',
      'seller-peer'
    );
    expect(crossStoreAnonymousPost).toHaveBeenCalledWith(
      '/public/seller-affiliate-links/token-1/sessions',
      'seller-peer'
    );
  });

  it('routes seller program and capabilities to the local Node', async () => {
    vi.mocked(nodeAuthGet).mockResolvedValueOnce(program).mockResolvedValueOnce({
      version: 2,
      rails: [],
    });
    vi.mocked(nodeAuthPut).mockResolvedValue(program);

    await getSellerAffiliateProgram();
    await getSellerAffiliateCapabilities();
    await putSellerAffiliateProgram({
      status: 'active',
      commissionRateBPS: 500,
      attributionWindowSeconds: 2_592_000,
    });

    expect(nodeAuthGet).toHaveBeenNthCalledWith(1, '/seller-affiliate/program');
    expect(nodeAuthGet).toHaveBeenNthCalledWith(2, '/seller-affiliate/capabilities');
    expect(nodeAuthPut).toHaveBeenCalledWith('/seller-affiliate/program', {
      status: 'active',
      commissionRateBPS: 500,
      attributionWindowSeconds: 2_592_000,
    });
  });

  it('routes seller link lifecycle to the local Node without account-scoped program paths', async () => {
    vi.mocked(nodeAuthGet).mockResolvedValue({ items: [link] });
    vi.mocked(nodeAuthPost).mockResolvedValue(link);

    await listSellerAffiliateLinks('program-1');
    await revokeSellerAffiliateLink('program-1', 'link-1');
    await reissueSellerAffiliateLink('link-1');

    expect(nodeAuthGet).toHaveBeenCalledWith('/seller-affiliate/links');
    expect(nodeAuthPost).toHaveBeenNthCalledWith(1, '/seller-affiliate/links/link-1/revoke');
    expect(nodeAuthPost).toHaveBeenNthCalledWith(2, '/seller-affiliate/links/link-1/reissue');
  });

  it('reads seller statements locally and promoter statements from the selected seller Peer', async () => {
    const evidence = { domain: 'mobazha:seller-affiliate-promoter-enrollment:v1' };
    vi.mocked(nodeAuthGet).mockResolvedValue({ items: [] });
    vi.mocked(nodeAuthPost).mockResolvedValue(evidence);
    vi.mocked(crossStoreAnonymousPost).mockResolvedValue({ items: [] });

    await listSellerAffiliateStatements('seller');
    await listSellerAffiliateStatements('promoter', {
      sellerPeerID: 'seller-peer',
      programID: 'program-1',
    });

    expect(nodeAuthGet).toHaveBeenCalledWith('/seller-affiliate/statements/seller');
    expect(nodeAuthPost).toHaveBeenCalledWith('/seller-affiliate/promoter-enrollments', {
      sellerPeerID: 'seller-peer',
      programID: 'program-1',
    });
    expect(crossStoreAnonymousPost).toHaveBeenCalledWith(
      '/public/seller-affiliate/statements/promoter',
      'seller-peer',
      { evidence }
    );
  });

  it('rejects a promoter statement read without an explicit seller and program target', async () => {
    await expect(listSellerAffiliateStatements('promoter')).rejects.toThrow(
      'promoter statement target is required'
    );

    expect(nodeAuthPost).not.toHaveBeenCalled();
    expect(crossStoreAnonymousPost).not.toHaveBeenCalled();
  });
});
