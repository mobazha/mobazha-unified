import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { NativeMarketplace } from '@mobazha/core';

const mockMarketplaces: NativeMarketplace[] = [
  {
    id: 'mp-active',
    name: 'Active Market',
    slug: 'active-market',
    status: 'published',
    ownerUserID: 'owner-1',
    buyerAccessMode: 'open',
    sellerReviewMode: 'manual',
    catalogMode: 'curated',
    discoverability: 'public',
    sellerEntryMode: 'operator_invited',
    vertical: 'general',
    plan: 'free',
    domains: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'mp-archived',
    name: 'Archived Market',
    slug: 'archived-market',
    status: 'archived',
    ownerUserID: 'owner-1',
    buyerAccessMode: 'open',
    sellerReviewMode: 'manual',
    catalogMode: 'curated',
    discoverability: 'unlisted',
    sellerEntryMode: 'operator_invited',
    vertical: 'general',
    plan: 'free',
    domains: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@mobazha/core', () => ({
  MARKETPLACE_LIFECYCLE_STATUS_KEYS: {
    draft: 'marketplace.enums.lifecycle.draft',
    published: 'marketplace.enums.lifecycle.published',
    suspended: 'marketplace.enums.lifecycle.suspended',
    archived: 'marketplace.enums.lifecycle.archived',
  },
  useI18n: () => ({
    t: (key: string) => key,
  }),
  useMyOperatorMarketplaces: () => ({
    marketplaces: mockMarketplaces,
    loading: false,
    loadFailed: false,
    refresh: vi.fn(),
    create: vi.fn(),
  }),
}));

vi.mock('@/components', () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import MarketplaceOperatorPage from '@/app/operator/marketplaces/page';

describe('MarketplaceOperatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps active marketplaces prominent and archived ones in history', () => {
    render(<MarketplaceOperatorPage />);

    expect(screen.getByTestId('operator-marketplaces-active-section')).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-card-mp-active')).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplaces-archived-section')).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-card-mp-archived')).toBeInTheDocument();
    expect(screen.queryByText('marketplace.operator.emptyTitle')).not.toBeInTheDocument();
  });
});
