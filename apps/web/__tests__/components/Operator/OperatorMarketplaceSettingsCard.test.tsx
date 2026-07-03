// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { NativeMarketplace } from '@mobazha/core';

const mockOnSave = vi.fn();
const mockOnArchive = vi.fn();
const mockOnVerifyCustomDomain = vi.fn();
const mockCopyToClipboard = vi.fn();

vi.mock('@mobazha/core', () => ({
  MARKETPLACE_CATALOG_MODE_KEYS: {
    open: 'marketplace.enums.catalogMode.open',
    curated: 'marketplace.enums.catalogMode.curated',
  },
  MARKETPLACE_DISCOVERABILITY_KEYS: {
    public: 'marketplace.enums.discoverability.public',
    unlisted: 'marketplace.enums.discoverability.unlisted',
  },
  MARKETPLACE_BUYER_ACCESS_MODE_KEYS: {
    open: 'marketplace.enums.buyerAccessMode.open',
  },
  MARKETPLACE_SELLER_REVIEW_MODE_KEYS: {
    auto: 'marketplace.enums.sellerReviewMode.auto',
    manual: 'marketplace.enums.sellerReviewMode.manual',
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
      if (key === 'marketplace.operator.customDomainVerifiedAt') {
        return `Verified at ${params?.date ?? ''}`;
      }
      return key;
    },
    formatDate: (value: string) => value,
  }),
}));

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

import { OperatorMarketplaceSettingsCard } from '@/components/Operator/OperatorMarketplaceSettingsCard';

function buildMarketplace(overrides: Partial<NativeMarketplace> = {}): NativeMarketplace {
  return {
    id: 'mp-1',
    name: 'Collectibles Hub',
    slug: 'collectibles-hub',
    status: 'draft',
    draftRevision: 1,
    publishedRevision: 0,
    hasUnpublishedChanges: true,
    ownerUserID: 'owner-1',
    buyerAccessMode: 'open',
    sellerReviewMode: 'manual',
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
    mockOnVerifyCustomDomain.mockResolvedValue(null);
    mockCopyToClipboard.mockResolvedValue(true);
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
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
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByText('marketplace.operator.readOnlyArchived')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-marketplace-save')).not.toBeInTheDocument();
  });

  it('shows pending DNS instructions with copy controls and verify action', async () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'market.example.com',
          kind: 'custom',
          verificationStatus: 'pending',
          verificationName: '_mobazha-marketplace.market.example.com',
          verificationValue: 'mobazha-verification=token-123',
          isPrimary: false,
        },
      ],
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
        onArchive={mockOnArchive}
      />
    );

    expect(
      screen.getByTestId('operator-marketplace-custom-domain-dns-instructions')
    ).toBeInTheDocument();
    expect(
      screen.getByText('marketplace.operator.customDomainDnsRecordTypeValue')
    ).toBeInTheDocument();
    expect(screen.getByText('_mobazha-marketplace.market.example.com')).toBeInTheDocument();
    expect(screen.getByText('mobazha-verification=token-123')).toBeInTheDocument();

    const copyButtons = screen.getAllByRole('button', { name: 'common.copy' });
    await act(async () => {
      fireEvent.click(copyButtons[0]);
    });
    expect(mockCopyToClipboard).toHaveBeenCalledWith('_mobazha-marketplace.market.example.com');

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-marketplace-custom-domain-verify'));
    });
    expect(mockOnVerifyCustomDomain).toHaveBeenCalledTimes(1);
  });

  it('shows verified timestamp when verifiedAt is available', () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'market.example.com',
          kind: 'custom',
          verificationStatus: 'verified',
          verifiedAt: '2026-06-01T00:00:00Z',
          isPrimary: true,
        },
      ],
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByTestId('operator-marketplace-custom-domain-verified-at')).toHaveTextContent(
      'Verified at 2026-06-01T00:00:00Z'
    );
  });

  it('hides old DNS challenge and verify action when domain input changes before save', () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'market.example.com',
          kind: 'custom',
          verificationStatus: 'pending',
          verificationName: '_mobazha-marketplace.market.example.com',
          verificationValue: 'mobazha-verification=token-123',
          isPrimary: false,
        },
      ],
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-custom-domain'), {
      target: { value: 'new.market.example.com' },
    });

    expect(
      screen.getByTestId('operator-marketplace-custom-domain-save-first-hint')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('operator-marketplace-custom-domain-dns-instructions')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('operator-marketplace-custom-domain-verify')
    ).not.toBeInTheDocument();
  });

  it('hides old DNS challenge and verify action when pending domain is cleared before save', () => {
    const marketplace = buildMarketplace({
      domains: [
        {
          host: 'market.example.com',
          kind: 'custom',
          verificationStatus: 'pending',
          verificationName: '_mobazha-marketplace.market.example.com',
          verificationValue: 'mobazha-verification=token-123',
          isPrimary: false,
        },
      ],
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-custom-domain'), {
      target: { value: '' },
    });

    expect(
      screen.getByTestId('operator-marketplace-custom-domain-save-first-hint')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('operator-marketplace-custom-domain-dns-instructions')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('operator-marketplace-custom-domain-verify')
    ).not.toBeInTheDocument();
  });

  it('does not show verify button for archived marketplace', () => {
    const marketplace = buildMarketplace({
      status: 'archived',
      domains: [
        {
          host: 'market.example.com',
          kind: 'custom',
          verificationStatus: 'pending',
          verificationName: '_mobazha-marketplace.market.example.com',
          verificationValue: 'mobazha-verification=token-123',
          isPrimary: false,
        },
      ],
    });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
        onArchive={mockOnArchive}
      />
    );

    expect(
      screen.queryByTestId('operator-marketplace-custom-domain-verify')
    ).not.toBeInTheDocument();
  });

  it('shows save-first hint for first custom domain before initial save', () => {
    const marketplace = buildMarketplace({ domains: [] });

    render(
      <OperatorMarketplaceSettingsCard
        marketplace={marketplace}
        working={null}
        onSave={mockOnSave}
        onVerifyCustomDomain={mockOnVerifyCustomDomain}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.change(screen.getByTestId('operator-marketplace-custom-domain'), {
      target: { value: 'first.market.example.com' },
    });

    expect(
      screen.getByTestId('operator-marketplace-custom-domain-save-first-hint')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('operator-marketplace-custom-domain-dns-instructions')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('operator-marketplace-custom-domain-verify')
    ).not.toBeInTheDocument();
  });
});
