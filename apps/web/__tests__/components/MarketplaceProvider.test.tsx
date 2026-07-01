// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceCurationConfig } from '@mobazha/core/types/marketplace';
import { MarketplaceProvider } from '@/components/MarketplaceProvider';
import { getCurrentMarketplaceConfig } from '@mobazha/core/services/api/marketplace';
import { resolveMarketplaceSubdomainFromWindow } from '@mobazha/core/marketplace/subdomain';
import { initializeRuntimeConfig } from '@mobazha/core/config/runtimeConfig';

vi.mock('@mobazha/core/services/api/marketplace', () => ({
  getCurrentMarketplaceConfig: vi.fn(),
}));

vi.mock('@mobazha/core/marketplace/subdomain', () => ({
  resolveMarketplaceSubdomainFromWindow: vi.fn(),
}));

const mockMarketplaceConfig: MarketplaceCurationConfig = {
  id: 'm2-wilson',
  vertical: 'collectibles',
  buyerAccessMode: 'open',
  sellerReviewMode: 'manual',
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
function setExperience(kind: 'platform' | 'marketplace') {
  initializeRuntimeConfig({
    schemaVersion: 3,
    authMode: 'hosted',
    deployment: { mode: 'hosted', allowExternalResources: true },
    experience: kind === 'marketplace' ? { kind, marketplaceIdentifier: 'm2-wilson' } : { kind },
    capabilitiesReady: true,
    features: {},
    capabilities: {
      commerce: { storefront: true, storeAdmin: true, checkout: true },
      marketplace: {
        discovery: true,
        operator: true,
        selling: true,
        curation: true,
        sellerReview: true,
        customDomains: true,
        releasePublishing: true,
        attribution: true,
      },
      sovereign: { isolatedRuntime: false, managedFleet: false },
      payments: { methods: [] },
    },
  });
}

describe('MarketplaceProvider domain/subdomain resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentMarketplaceConfig.mockResolvedValue(mockMarketplaceConfig);
    mockResolveMarketplaceSubdomainFromWindow.mockReturnValue('collectibles');
    setExperience('platform');
  });

  it('uses current hostname as domain for a dedicated marketplace experience', async () => {
    setExperience('marketplace');

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

  it('keeps subdomain resolution behavior for the platform experience', async () => {
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
