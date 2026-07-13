// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SourceDepositCollateralFundingSection } from '@/components/collectibles/SourceDepositCollateralFundingSection';
import { CollectibleCollateralProtectionSummary } from '@/components/collectibles/CollectibleCollateralProtectionSummary';

const mockPrepareFundingTarget = vi.fn();
const mockFindResourceAccount = vi.fn().mockResolvedValue(null);
const mockRefreshCapabilities = vi.fn();
const sellerPeerID = 'QmSellerPeerID1234567890abcdefghijklmnop';
const otherPeerID = 'QmOtherPeerID1234567890abcdefghijklmnop';

let mockProfilePeerID: string | undefined = sellerPeerID;

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useAppKit: () => ({
      address: '0xabc00000000000000000000000000000000000033',
      isConnected: true,
      isInitializing: false,
      connectEVM: vi.fn(),
      getWalletProvider: () => null,
    }),
    useWallet: () => ({
      getSigner: vi.fn(),
    }),
    useUserStore: (selector: (state: { profile?: { peerID?: string } }) => unknown) =>
      selector({ profile: mockProfilePeerID ? { peerID: mockProfilePeerID } : undefined }),
    useCollateralOperator: () => ({
      capabilities: {
        available: true,
        rail: {
          id: 'io.mobazha.collateral.evm-vault',
          version: '1',
          custodyModel: 'contract-vault',
          assets: ['crypto:eip155:56:erc20:0x0000000000000000000000000000000000000002'],
          supportsFundingTargets: true,
          supportsFundingObserve: true,
          supportsPrincipalRelease: true,
          supportsClaimSlash: true,
          supportsReconciliation: true,
          hasReceiptVerification: true,
        },
      },
      account: {
        collateralID: 'col-1',
        providerID: 'io.mobazha.collectibles',
        resourceID: 'dep-1',
        assetID: 'crypto:eip155:56:erc20:0x0000000000000000000000000000000000000001',
        requiredAmount: '100',
        policyID: 'io.mobazha.collectibles.source-custody',
        policyVersion: '1',
        fundedAmount: '100',
        availableAmount: '100',
        revision: 2,
        state: 'active',
        expiresAt: '2027-01-01T00:00:00.000Z',
      },
      bindingMismatch: false,
      fundingTarget: null,
      loading: false,
      error: null,
      findResourceAccount: mockFindResourceAccount,
      openAccount: vi.fn(),
      prepareFundingTarget: mockPrepareFundingTarget,
      reconcileFunding: vi.fn(),
      refreshCapabilities: mockRefreshCapabilities,
      clearError: vi.fn(),
    }),
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en',
    }),
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const baseDeposit = {
  sourceDepositID: 'dep-1',
  certNumber: 'PSA-9',
  sellerPeerID,
  guaranteeAmount: '100',
  guaranteeCurrency: 'crypto:eip155:56:erc20:0x0000000000000000000000000000000000000001',
  status: 'source_held',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('SourceDepositCollateralFundingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfilePeerID = sellerPeerID;
  });

  it('blocks unsupported guarantee assets before opening an account', () => {
    render(<SourceDepositCollateralFundingSection deposit={baseDeposit} />);
    expect(screen.getByTestId('collateral-unsupported-asset')).toBeInTheDocument();
    expect(screen.queryByTestId('collateral-open-account')).not.toBeInTheDocument();
  });

  it('allows collateral lookup when deposit owner matches the current principal', () => {
    render(<SourceDepositCollateralFundingSection deposit={baseDeposit} />);
    expect(screen.queryByTestId('collateral-principal-binding-blocked')).not.toBeInTheDocument();
    expect(mockFindResourceAccount).toHaveBeenCalled();
  });

  it('blocks collateral lookup when deposit seller identity is missing', () => {
    render(
      <SourceDepositCollateralFundingSection
        deposit={{ ...baseDeposit, sellerPeerID: undefined }}
      />
    );
    expect(screen.getByTestId('collateral-principal-binding-blocked')).toHaveTextContent(
      'collectibles.collateral.funding.principalDepositOwnerMissing'
    );
    expect(mockFindResourceAccount).not.toHaveBeenCalled();
    expect(screen.getByTestId('collectible-collateral-protection-badge')).toHaveTextContent(
      'collectibles.collateral.protection.status.declared'
    );
  });

  it('blocks collateral lookup when current principal identity is unavailable', () => {
    mockProfilePeerID = undefined;
    render(<SourceDepositCollateralFundingSection deposit={baseDeposit} />);
    expect(screen.getByTestId('collateral-principal-binding-blocked')).toHaveTextContent(
      'collectibles.collateral.funding.principalIdentityUnavailable'
    );
    expect(mockFindResourceAccount).not.toHaveBeenCalled();
  });

  it('blocks collateral lookup when deposit owner mismatches the current principal', () => {
    mockProfilePeerID = otherPeerID;
    render(<SourceDepositCollateralFundingSection deposit={baseDeposit} />);
    expect(screen.getByTestId('collateral-principal-binding-blocked')).toHaveTextContent(
      'collectibles.collateral.funding.principalIdentityMismatch'
    );
    expect(mockFindResourceAccount).not.toHaveBeenCalled();
    expect(screen.getByTestId('collectible-collateral-protection-badge')).toHaveTextContent(
      'collectibles.collateral.protection.status.declared'
    );
  });
});

describe('CollectibleCollateralProtectionSummary fail-closed display', () => {
  it('never shows active protection from hosting requirement status alone', () => {
    render(
      <CollectibleCollateralProtectionSummary
        deposit={{
          guaranteeAmount: '100',
          guaranteeCurrency: 'crypto:eip155:56:erc20:0x0000000000000000000000000000000000000001',
          collateralRequirementStatus: 'active',
        }}
      />
    );
    expect(screen.getByTestId('collectible-collateral-protection-badge')).toHaveTextContent(
      'collectibles.collateral.protection.status.declared'
    );
  });

  it('shows humanized guarantee fields with technical details collapsed by default', () => {
    render(
      <CollectibleCollateralProtectionSummary
        deposit={{
          guaranteeAmount: '1000000',
          guaranteeCurrency: 'crypto:eip155:56:erc20:0x0000000000000000000000000000000000000001',
        }}
        variant="buyer"
      />
    );
    expect(screen.getByText('collectibles.collateral.fields.guaranteeAsset')).toBeInTheDocument();
    expect(screen.getByText('collectibles.collateral.fields.requiredAmount')).toBeInTheDocument();
    expect(screen.getByText('collectibles.collateral.protection.buyerHint')).toBeInTheDocument();
    expect(screen.getByText('collectibles.experience.technicalDetails')).toBeInTheDocument();
  });
});
