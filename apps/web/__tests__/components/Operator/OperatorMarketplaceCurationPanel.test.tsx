// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceCurationCandidates, MarketplaceCurationItem } from '@mobazha/core';

vi.mock('@mobazha/core', () => ({
  buildProductHref: (slug: string, peerID: string) => `/product/${slug}?peerID=${peerID}`,
  formatListingSlugTitle: (slug: string) => slug.replace(/[-_]+/g, ' '),
  formatUserName: ({ peerID }: { peerID?: string }) => `Store ${peerID ?? ''}`,
  useCommunityMarketplaceEnrichment: () => ({
    listingPreviews: [],
    sellerProfiles: {
      QmSellerA: { peerID: 'QmSellerA', displayName: 'Alice Cards' },
    },
  }),
  useI18n: () => ({
    t: (key: string, params?: Record<string, number>) =>
      key === 'marketplace.operator.curation.candidateCount'
        ? `${params?.count ?? 0} eligible candidates`
        : key,
  }),
}));

import { OperatorMarketplaceCurationPanel } from '@/components/Operator/OperatorMarketplaceCurationPanel';

const onRetry = vi.fn();
const onAdd = vi.fn();
const onReorder = vi.fn();
const onToggle = vi.fn();
const onRemove = vi.fn();
const onLoadCandidates = vi.fn();

function buildItem(overrides: Partial<MarketplaceCurationItem>): MarketplaceCurationItem {
  return {
    id: 1,
    kind: 'listing',
    peerID: 'QmPeer',
    listingSlug: 'alpha',
    sortOrder: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const candidates: MarketplaceCurationCandidates = {
  sellers: [{ peerID: 'QmSellerA' }, { peerID: 'QmSellerB' }],
  listings: [
    { peerID: 'QmPeer', slug: 'alpha', title: 'Alpha Title' },
    { peerID: 'QmPeer', slug: 'beta', title: 'Beta Title' },
  ],
  page: 1,
  pageSize: 20,
  total: 2,
  totalPage: 2,
};

describe('OperatorMarketplaceCurationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds from eligible non-duplicate listing candidates', async () => {
    render(
      <OperatorMarketplaceCurationPanel
        items={[buildItem({ id: 1, kind: 'listing', peerID: 'QmPeer', listingSlug: 'alpha' })]}
        candidates={candidates}
        loading={false}
        error={null}
        working={null}
        isReadOnly={false}
        onRetry={onRetry}
        onAdd={onAdd}
        onReorder={onReorder}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    );

    // Already-curated candidates never appear in the grid; eligible ones are
    // featured with a single click on their card.
    expect(screen.queryByTestId('operator-curation-candidate-QmPeer::alpha')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-curation-candidate-QmPeer::beta'));
    });

    expect(onAdd).toHaveBeenCalledWith('listing', { peerID: 'QmPeer', listingSlug: 'beta' });
  });

  it('shows only eligible candidates in the listing grid', () => {
    render(
      <OperatorMarketplaceCurationPanel
        items={[buildItem({ id: 1, kind: 'listing', peerID: 'QmPeer', listingSlug: 'alpha' })]}
        candidates={candidates}
        loading={false}
        error={null}
        working={null}
        isReadOnly={false}
        onRetry={onRetry}
        onAdd={onAdd}
        onReorder={onReorder}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    );

    expect(screen.queryByTestId('operator-curation-candidate-QmPeer::alpha')).toBeNull();
    expect(screen.getByTestId('operator-curation-candidate-QmPeer::beta')).toBeEnabled();
  });

  it('keeps the candidate available when onAdd resolves false', async () => {
    onAdd.mockResolvedValueOnce(false);
    render(
      <OperatorMarketplaceCurationPanel
        items={[buildItem({ id: 1, kind: 'listing', peerID: 'QmPeer', listingSlug: 'alpha' })]}
        candidates={candidates}
        loading={false}
        error={null}
        working={null}
        isReadOnly={false}
        onRetry={onRetry}
        onAdd={onAdd}
        onReorder={onReorder}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-curation-candidate-QmPeer::beta'));
    });

    expect(onAdd).toHaveBeenCalledWith('listing', { peerID: 'QmPeer', listingSlug: 'beta' });
    expect(screen.getByTestId('operator-curation-candidate-QmPeer::beta')).toBeInTheDocument();
  });

  it('uses listing slug as fallback title before generic label', () => {
    render(
      <OperatorMarketplaceCurationPanel
        items={[]}
        candidates={{
          sellers: [],
          listings: [{ peerID: 'QmPeer', slug: 'rare-card-2024', title: '   ' }],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPage: 1,
        }}
        loading={false}
        error={null}
        working={null}
        isReadOnly={false}
        onRetry={onRetry}
        onAdd={onAdd}
        onReorder={onReorder}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    );

    expect(screen.getAllByText(/rare card 2024/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('marketplace.operator.curation.listingFallbackTitle')).toBeNull();
  });

  it('searches and pages listing candidates while showing readable seller names', async () => {
    render(
      <OperatorMarketplaceCurationPanel
        items={[]}
        candidates={candidates}
        loading={false}
        candidatesLoading={false}
        error={null}
        working={null}
        isReadOnly={false}
        onRetry={onRetry}
        onAdd={onAdd}
        onReorder={onReorder}
        onToggle={onToggle}
        onRemove={onRemove}
        onLoadCandidates={onLoadCandidates}
      />
    );

    expect(screen.getByRole('option', { name: /Alice Cards.*QmSellerA/i })).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('operator-curation-candidate-search'), {
      target: { value: 'rare card' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-curation-candidate-search-submit'));
    });
    expect(onLoadCandidates).toHaveBeenCalledWith({ q: 'rare card', page: 1, pageSize: 20 });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('marketplace.operator.curation.nextPage'));
    });
    expect(onLoadCandidates).toHaveBeenCalledWith({ q: undefined, page: 2, pageSize: 20 });
  });

  it('reorders by submitting the full ordered IDs for kind', () => {
    render(
      <OperatorMarketplaceCurationPanel
        items={[
          buildItem({ id: 101, kind: 'listing', listingSlug: 'alpha', sortOrder: 0 }),
          buildItem({ id: 102, kind: 'listing', listingSlug: 'beta', sortOrder: 1 }),
        ]}
        candidates={candidates}
        loading={false}
        error={null}
        working={null}
        isReadOnly={false}
        onRetry={onRetry}
        onAdd={onAdd}
        onReorder={onReorder}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    );

    const rows = screen.getAllByTestId(/operator-curation-item-listing-/);
    const firstRowMoveDown = rows[0].querySelector(
      'button[aria-label="marketplace.operator.curation.moveDownAria"]'
    );
    expect(firstRowMoveDown).toBeTruthy();
    fireEvent.click(firstRowMoveDown as HTMLButtonElement);

    expect(onReorder).toHaveBeenCalledWith('listing', [102, 101]);
  });

  it('supports toggle and remove actions', () => {
    render(
      <OperatorMarketplaceCurationPanel
        items={[buildItem({ id: 77, kind: 'seller', peerID: 'QmSellerA', listingSlug: undefined })]}
        candidates={candidates}
        loading={false}
        error={null}
        working={null}
        isReadOnly={false}
        onRetry={onRetry}
        onAdd={onAdd}
        onReorder={onReorder}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    );

    fireEvent.click(screen.getByText('marketplace.operator.curation.deactivate'));
    fireEvent.click(screen.getByLabelText('marketplace.operator.curation.removeAria'));

    expect(onToggle).toHaveBeenCalledWith(77, false);
    expect(onRemove).toHaveBeenCalledWith(77);
  });

  it('is read-only for archived marketplaces', () => {
    render(
      <OperatorMarketplaceCurationPanel
        items={[buildItem({ id: 1 })]}
        candidates={candidates}
        loading={false}
        error={null}
        working={null}
        isReadOnly
        onRetry={onRetry}
        onAdd={onAdd}
        onReorder={onReorder}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    );

    expect(screen.getByTestId('operator-curation-candidate-QmPeer::beta')).toBeDisabled();
    expect(screen.getByLabelText('marketplace.operator.curation.moveDownAria')).toBeDisabled();
    expect(screen.getByText('marketplace.operator.curation.deactivate')).toBeDisabled();
    expect(screen.getByLabelText('marketplace.operator.curation.removeAria')).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
