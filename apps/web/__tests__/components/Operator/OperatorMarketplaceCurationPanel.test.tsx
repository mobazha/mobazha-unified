import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceCurationCandidates, MarketplaceCurationItem } from '@mobazha/core';

vi.mock('@mobazha/core', () => ({
  buildProductHref: (slug: string, peerID: string) => `/product/${slug}?peerID=${peerID}`,
  formatListingSlugTitle: (slug: string) => slug.replace(/[-_]+/g, ' '),
  formatUserName: ({ peerID }: { peerID?: string }) => `Store ${peerID ?? ''}`,
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

    const listingSelect = screen.getByTestId('operator-curation-select-listing');
    act(() => {
      fireEvent.change(listingSelect, { target: { value: 'QmPeer::beta' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-curation-add-listing'));
    });

    expect(onAdd).toHaveBeenCalledWith('listing', { peerID: 'QmPeer', listingSlug: 'beta' });
  });

  it('disables add action until a concrete candidate is selected', () => {
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

    const listingAddButton = screen.getByTestId('operator-curation-add-listing');
    expect(listingAddButton).toBeDisabled();
    fireEvent.change(screen.getByTestId('operator-curation-select-listing'), {
      target: { value: 'QmPeer::beta' },
    });
    expect(listingAddButton).toBeEnabled();
  });

  it('keeps selected value when onAdd resolves false', async () => {
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

    const listingSelect = screen.getByTestId(
      'operator-curation-select-listing'
    ) as HTMLSelectElement;
    fireEvent.change(listingSelect, { target: { value: 'QmPeer::beta' } });
    expect(listingSelect.value).toBe('QmPeer::beta');

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-curation-add-listing'));
    });

    expect(onAdd).toHaveBeenCalledWith('listing', { peerID: 'QmPeer', listingSlug: 'beta' });
    expect(listingSelect.value).toBe('QmPeer::beta');
  });

  it('uses listing slug as fallback title before generic label', () => {
    render(
      <OperatorMarketplaceCurationPanel
        items={[]}
        candidates={{
          sellers: [],
          listings: [{ peerID: 'QmPeer', slug: 'rare-card-2024', title: '   ' }],
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

    expect(screen.getByTestId('operator-curation-add-listing')).toBeDisabled();
    expect(screen.getByLabelText('marketplace.operator.curation.moveDownAria')).toBeDisabled();
    expect(screen.getByText('marketplace.operator.curation.deactivate')).toBeDisabled();
    expect(screen.getByLabelText('marketplace.operator.curation.removeAria')).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
