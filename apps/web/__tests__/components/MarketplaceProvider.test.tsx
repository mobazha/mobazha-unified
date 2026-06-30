import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceCurationConfig } from '@mobazha/core/types/marketplace';
import { MarketplaceProvider } from '@/components/MarketplaceProvider';
import { getCurrentMarketplaceConfig } from '@mobazha/core/services/api/marketplace';
import { resolveMarketplaceSubdomainFromWindow } from '@mobazha/core/marketplace/subdomain';
import { getCurationHomePath } from '@mobazha/core/config/curationHomePath';

vi.mock('@mobazha/core/services/api/marketplace', () => ({
  getCurrentMarketplaceConfig: vi.fn(),
}));

vi.mock('@mobazha/core/marketplace/subdomain', () => ({
  resolveMarketplaceSubdomainFromWindow: vi.fn(),
}));

vi.mock('@mobazha/core/config/curationHomePath', () => ({
  getCurationHomePath: vi.fn(),
}));

const mockMarketplaceConfig: MarketplaceCurationConfig = {
  id: 'm2-wilson',
  vertical: 'collectibles',
  joinMode: 'approval',
  catalogMode: 'open',
  discoverability: 'public',
  sellerEntryMode: 'operator_invited',
  allowedPeers: [],
  sellers: [],
  featured: [],
  brand: { name: 'Collectibles' },
  taxonomy: [],
  policy: {},
  attribution: {
    utmSource: 'm2-wilson',
    marketplaceId: 'm2-wilson',
  },
};

const mockGetCurrentMarketplaceConfig = vi.mocked(getCurrentMarketplaceConfig);
const mockResolveMarketplaceSubdomainFromWindow = vi.mocked(resolveMarketplaceSubdomainFromWindow);
const mockGetCurationHomePath = vi.mocked(getCurationHomePath);

describe('MarketplaceProvider domain/subdomain resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentMarketplaceConfig.mockResolvedValue(mockMarketplaceConfig);
    mockResolveMarketplaceSubdomainFromWindow.mockReturnValue('collectibles');
    mockGetCurationHomePath.mockReturnValue(null);
  });

  it('uses current hostname as domain when curationHomePath is configured', async () => {
    mockGetCurationHomePath.mockReturnValue('/marketplace/m2-wilson');

    render(
      <MarketplaceProvider>
        <div>checkout</div>
      </MarketplaceProvider>
    );

    await waitFor(() => {
      expect(mockGetCurrentMarketplaceConfig).toHaveBeenCalledWith({
        subdomain: undefined,
        domain: window.location.hostname,
      });
    });
    expect(mockResolveMarketplaceSubdomainFromWindow).not.toHaveBeenCalled();
  });

  it('keeps subdomain resolution behavior when curationHomePath is absent', async () => {
    render(
      <MarketplaceProvider>
        <div>checkout</div>
      </MarketplaceProvider>
    );

    await waitFor(() => {
      expect(mockGetCurrentMarketplaceConfig).toHaveBeenCalledWith({
        subdomain: 'collectibles',
        domain: undefined,
      });
    });
    expect(mockResolveMarketplaceSubdomainFromWindow).toHaveBeenCalled();
  });
});
