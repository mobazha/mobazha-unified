// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockGetMarketplacePreview = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'mp-1' }),
}));

vi.mock('@mobazha/core/services/api/marketplace', () => ({
  getMarketplacePreview: (...args: unknown[]) => mockGetMarketplacePreview(...args),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
    derivePublicMarketplaceCurationRefs: () => ({
      bannerListingRefs: [],
      curatedListingRefs: [],
      fallbackListingRefs: [],
      curatedSellerPeerIDs: [],
      fallbackSellerPeerIDs: [],
    }),
    useCommunityMarketplaceEnrichment: () => ({
      listingPreviews: [],
      sellerProfiles: {},
    }),
  };
});

vi.mock('@/components', () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/components/CommunityMarketplace', () => ({
  CommunityListingCard: () => <div data-testid="preview-listing-card" />,
  CommunitySellerCard: () => <div data-testid="preview-seller-card" />,
}));

import MarketplaceOperatorPreviewPage from '@/app/operator/marketplaces/[id]/preview/page';

describe('MarketplaceOperatorPreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders preview identity + grouped sections', async () => {
    mockGetMarketplacePreview.mockResolvedValueOnce({
      marketplace: {
        id: 'mp-1',
        name: 'Draft Market',
        slug: 'draft-market',
        description: 'Draft description',
        logoURL: 'https://example.test/logo.png',
        bannerURL: 'https://example.test/banner.png',
        publicURL: 'https://example.test',
        buyerAccessMode: 'open',
        sellerReviewMode: 'manual',
        catalogMode: 'curated',
        discoverability: 'public',
        sellerEntryMode: 'operator_invited',
        vertical: 'collectibles',
        sellerCount: 0,
        productCount: 0,
      },
      sellers: [],
      featured: [],
      banners: [],
      listings: {
        listings: [],
        total: 0,
        page: 1,
        pageSize: 24,
        totalPage: 0,
      },
    });

    render(<MarketplaceOperatorPreviewPage />);

    expect(screen.getByTestId('operator-preview-loading')).toBeInTheDocument();
    await waitFor(() => expect(mockGetMarketplacePreview).toHaveBeenCalledWith('mp-1'));
    await waitFor(() =>
      expect(screen.getByTestId('operator-preview-identity')).toBeInTheDocument()
    );
    expect(screen.getByTestId('operator-preview-draft-notice')).toBeInTheDocument();
    expect(screen.getByTestId('operator-preview-banners')).toBeInTheDocument();
    expect(screen.getByTestId('operator-preview-listings')).toBeInTheDocument();
    expect(screen.getByTestId('operator-preview-sellers')).toBeInTheDocument();
    expect(screen.getByTestId('operator-preview-back-link')).toBeInTheDocument();
  });

  it('shows error and retries loading preview', async () => {
    mockGetMarketplacePreview.mockRejectedValueOnce(new Error('failed'));
    mockGetMarketplacePreview.mockResolvedValueOnce({
      marketplace: {
        id: 'mp-1',
        name: 'Draft Market',
        slug: 'draft-market',
        publicURL: 'https://example.test',
        buyerAccessMode: 'open',
        sellerReviewMode: 'manual',
        catalogMode: 'curated',
        discoverability: 'public',
        sellerEntryMode: 'operator_invited',
        vertical: 'collectibles',
        sellerCount: 0,
        productCount: 0,
      },
      sellers: [],
      featured: [],
      banners: [],
      listings: {
        listings: [],
        total: 0,
        page: 1,
        pageSize: 24,
        totalPage: 0,
      },
    });

    render(<MarketplaceOperatorPreviewPage />);

    await waitFor(() => expect(screen.getByTestId('operator-preview-error')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-preview-retry'));
    });

    await waitFor(() => expect(mockGetMarketplacePreview).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId('operator-preview-identity')).toBeInTheDocument()
    );
  });
});
