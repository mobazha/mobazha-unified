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
  MARKETPLACE_JOIN_MODE_KEYS: {
    open: 'marketplace.enums.joinMode.open',
    approval: 'marketplace.enums.joinMode.approval',
    invite: 'marketplace.enums.joinMode.invite',
  },
  MARKETPLACE_SELLER_ENTRY_MODE_KEYS: {
    operator_invited: 'marketplace.enums.sellerEntryMode.operatorInvited',
    seller_self_serve: 'marketplace.enums.sellerEntryMode.sellerSelfServe',
  },
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'marketplace.enums.domainVerification.pending') return 'Pending verification';
      if (key === 'marketplace.enums.domainVerification.verified') return 'Verified';
      if (key === 'marketplace.operator.customDomainStatusValue') {
        return `${params?.host ?? ''} (${params?.status ?? ''})`;
      }
      return key;
    },
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
    description: 'Curated collectibles',
    logoURL: 'https://cdn.example.com/logo.png',
    bannerURL: 'https://cdn.example.com/banner.png',
    catalogQuery: 'featured:true',
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

  it('shows platform subdomain as read-only and interpolated custom domain verification state', () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'collectibles.mobazha.shop',
          kind: 'subdomain',
          verificationStatus: 'verified',
          isPrimary: true,
        },
        {
          host: 'market.example.com',
          kind: 'custom',
          verificationStatus: 'pending',
          isPrimary: false,
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

    expect(screen.getByTestId('operator-marketplace-platform-subdomain')).toHaveValue(
      'collectibles.mobazha.shop'
    );
    expect(screen.getByTestId('operator-marketplace-platform-subdomain')).toBeDisabled();
    expect(screen.getByTestId('operator-marketplace-custom-domain-status')).toHaveTextContent(
      'market.example.com (Pending verification)'
    );
  });

  it('sends empty optional strings to clear fields', async () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'market.example.com',
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

    fireEvent.change(screen.getByTestId('operator-marketplace-description'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByTestId('operator-marketplace-logo-url'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByTestId('operator-marketplace-banner-url'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByTestId('operator-marketplace-catalog-query'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByTestId('operator-marketplace-custom-domain'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('operator-marketplace-save'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        description: '',
        logoURL: '',
        bannerURL: '',
        catalogQuery: '',
        domain: '',
      });
    });
  });

  it('validates required name, vertical, hostname, and media URLs', () => {
    render(
      <OperatorMarketplaceSettingsCard
        marketplace={buildMarketplace()}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-name'), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByTestId('operator-marketplace-custom-domain'), {
      target: { value: 'not-valid-domain' },
    });
    fireEvent.change(screen.getByTestId('operator-marketplace-logo-url'), {
      target: { value: 'ftp://logo.png' },
    });
    fireEvent.change(screen.getByTestId('operator-marketplace-banner-url'), {
      target: { value: 'invalid-url' },
    });
    fireEvent.change(screen.getByTestId('operator-marketplace-vertical'), {
      target: { value: '   ' },
    });

    expect(screen.getByTestId('operator-marketplace-name-error')).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-vertical-error')).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-custom-domain-error')).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-logo-url-error')).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-banner-url-error')).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-save')).toBeDisabled();
  });

  it('shows discard action when dirty and resets to current marketplace values', () => {
    const marketplace = buildMarketplace({
      name: 'Collectibles Hub',
      vertical: 'collectibles',
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.queryByTestId('operator-marketplace-discard')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('operator-marketplace-name'), {
      target: { value: 'Edited Name' },
    });
    fireEvent.change(screen.getByTestId('operator-marketplace-vertical'), {
      target: { value: 'books' },
    });
    expect(screen.getByTestId('operator-marketplace-discard')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('operator-marketplace-discard'));

    expect(screen.getByTestId('operator-marketplace-name')).toHaveValue('Collectibles Hub');
    expect(screen.getByTestId('operator-marketplace-vertical')).toHaveValue('collectibles');
    expect(screen.queryByTestId('operator-marketplace-discard')).not.toBeInTheDocument();
  });

  it('disables discard action while busy', () => {
    render(
      <OperatorMarketplaceSettingsCard
        marketplace={buildMarketplace()}
        working="update"
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-name'), {
      target: { value: 'Edited Name' },
    });

    expect(screen.getByTestId('operator-marketplace-discard')).toBeDisabled();
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

  it('keeps archived marketplace fully read-only', () => {
    render(
      <OperatorMarketplaceSettingsCard
        marketplace={buildMarketplace({ status: 'archived' })}
        working={null}
        onSave={mockOnSave}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByText('marketplace.operator.readOnlyArchived')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-marketplace-save')).not.toBeInTheDocument();
  });
});
