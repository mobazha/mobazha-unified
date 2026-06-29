import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { NativeMarketplace } from '@mobazha/core';

const mockOnSave = vi.fn();
const mockOnArchive = vi.fn();

vi.mock('@mobazha/core', () => ({
  MARKETPLACE_CATALOG_MODE_KEYS: {
    open: 'marketplace.enums.catalogMode.open',
    curated: 'marketplace.enums.catalogMode.curated',
  },
  MARKETPLACE_DISCOVERABILITY_KEYS: {
    public: 'marketplace.enums.discoverability.public',
    unlisted: 'marketplace.enums.discoverability.unlisted',
  },
  MARKETPLACE_SELLER_ENTRY_MODE_KEYS: {
    operator_invited: 'marketplace.enums.sellerEntryMode.operator_invited',
    seller_self_serve: 'marketplace.enums.sellerEntryMode.seller_self_serve',
  },
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

import { OperatorMarketplaceSettingsCard } from '@/components/Operator/OperatorMarketplaceSettingsCard';

function buildMarketplace(overrides: Partial<NativeMarketplace> = {}): NativeMarketplace {
  return {
    id: 'mp-1',
    name: 'Collectibles Hub',
    slug: 'collectibles-hub',
    status: 'draft',
    ownerUserID: 'owner-1',
    joinMode: 'approval',
    catalogMode: 'curated',
    discoverability: 'public',
    sellerEntryMode: 'operator_invited',
    vertical: 'collectibles',
    plan: 'free',
    domains: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('OperatorMarketplaceSettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(null);
    mockOnArchive.mockResolvedValue(undefined);
  });

  it('initializes subdomain input with token derived from subdomain host', () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'token.localhost',
          kind: 'subdomain',
          verificationStatus: 'verified',
          isPrimary: true,
        },
      ],
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByTestId('operator-marketplace-subdomain')).toHaveValue('token');
  });

  it('submits subdomain token when subdomain host changes', async () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'token.localhost',
          kind: 'subdomain',
          verificationStatus: 'verified',
          isPrimary: true,
        },
      ],
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-subdomain'), {
      target: { value: 'newtoken' },
    });
    fireEvent.click(screen.getByTestId('operator-marketplace-save'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ subdomain: 'newtoken' });
    });
  });

  it('blocks clearing an existing subdomain and disables save', () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'token.example.com',
          kind: 'subdomain',
          verificationStatus: 'verified',
          isPrimary: true,
        },
      ],
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-subdomain'), {
      target: { value: '' },
    });

    expect(screen.getByTestId('operator-marketplace-subdomain-clear-blocked')).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-save')).toBeDisabled();
  });

  it('blocks clearing an existing custom domain and disables save', () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'shop.example.com',
          kind: 'custom',
          verificationStatus: 'verified',
          isPrimary: true,
        },
      ],
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-custom-domain'), {
      target: { value: '' },
    });

    expect(
      screen.getByTestId('operator-marketplace-custom-domain-clear-blocked')
    ).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-save')).toBeDisabled();
  });

  it('allows empty subdomain when no subdomain domain exists', () => {
    render(
      <OperatorMarketplaceSettingsCard
        marketplace={buildMarketplace()}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByTestId('operator-marketplace-subdomain')).toHaveValue('');
    expect(
      screen.queryByTestId('operator-marketplace-subdomain-clear-blocked')
    ).not.toBeInTheDocument();
  });

  it('preserves in-progress edits when marketplace prop rerenders with the same id', () => {
    const marketplace = buildMarketplace({ name: 'Collectibles Hub' });
    const { rerender } = render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-name'), {
      target: { value: 'Edited Name' },
    });

    rerender(
      <OperatorMarketplaceSettingsCard
        marketplace={{ ...marketplace, name: 'Server Refreshed Name' }}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByTestId('operator-marketplace-name')).toHaveValue('Edited Name');
  });

  it('resets form to saved marketplace values after successful save', async () => {
    const marketplace = buildMarketplace({ name: 'Collectibles Hub' });
    const savedMarketplace = buildMarketplace({ name: 'Saved Name' });
    mockOnSave.mockResolvedValue(savedMarketplace);

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-name'), {
      target: { value: 'Edited Name' },
    });
    fireEvent.click(screen.getByTestId('operator-marketplace-save'));

    await waitFor(() => {
      expect(screen.getByTestId('operator-marketplace-name')).toHaveValue('Saved Name');
    });
  });

  it('reinitializes form when remounted for a different marketplace id', () => {
    const firstMarketplace = buildMarketplace({ id: 'mp-1', name: 'First Market' });
    const secondMarketplace = buildMarketplace({ id: 'mp-2', name: 'Second Market' });
    const { rerender } = render(
      <OperatorMarketplaceSettingsCard
        key={firstMarketplace.id}
        marketplace={firstMarketplace}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-name'), {
      target: { value: 'Edited Name' },
    });

    rerender(
      <OperatorMarketplaceSettingsCard
        key={secondMarketplace.id}
        marketplace={secondMarketplace}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByTestId('operator-marketplace-name')).toHaveValue('Second Market');
  });
});
