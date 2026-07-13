// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceDepositCollateralFundingSection } from '@/components/collectibles/SourceDepositCollateralFundingSection';

const mockGetCapabilities = vi.hoisted(() => vi.fn());
const mockListAccounts = vi.hoisted(() => vi.fn());

const sellerPeerID = 'QmSellerPeerID1234567890abcdefghijklmnop';
const otherPeerID = 'QmOtherPeerID1234567890abcdefghijklmnop';

let mockProfilePeerID: string | undefined = sellerPeerID;

vi.mock('@mobazha/core/services/api/collateral', () => ({
  collateralApi: {
    getCapabilities: mockGetCapabilities,
    listAccounts: mockListAccounts,
    getAccount: vi.fn(),
    openAccount: vi.fn(),
    prepareFundingTarget: vi.fn(),
    reconcileFunding: vi.fn(),
  },
}));

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
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en',
    }),
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const supportedAssetID = 'crypto:eip155:56:erc20:0x0000000000000000000000000000000000000002';

const baseDeposit = {
  sourceDepositID: 'dep-1',
  certNumber: 'PSA-9',
  sellerPeerID,
  guaranteeAmount: '100',
  guaranteeCurrency: supportedAssetID,
  status: 'source_held',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const activeAccount = {
  collateralID: 'col-1',
  providerID: 'io.mobazha.collectibles',
  resourceID: 'dep-1',
  assetID: supportedAssetID,
  requiredAmount: '100',
  policyID: 'io.mobazha.collectibles.source-custody',
  policyVersion: '1',
  fundedAmount: '100',
  availableAmount: '100',
  revision: 2,
  state: 'active',
  expiresAt: '2027-01-01T00:00:00.000Z',
};

describe('SourceDepositCollateralFundingSection principal scope rerender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfilePeerID = sellerPeerID;
    mockGetCapabilities.mockResolvedValue({
      available: true,
      rail: {
        id: 'io.mobazha.collateral.evm-vault',
        version: '1',
        custodyModel: 'contract-vault',
        assets: [supportedAssetID],
        supportsFundingTargets: true,
        supportsFundingObserve: true,
        supportsPrincipalRelease: true,
        supportsClaimSlash: true,
        supportsReconciliation: true,
        hasReceiptVerification: true,
      },
    });
    mockListAccounts.mockResolvedValue({ items: [activeAccount] });
  });

  it('drops active account actions after principal mismatch without issuing new lookup calls', async () => {
    const view = render(<SourceDepositCollateralFundingSection deposit={baseDeposit} />);

    await waitFor(() => {
      expect(mockGetCapabilities).toHaveBeenCalled();
      expect(mockListAccounts).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('collectible-collateral-protection-badge')).toHaveTextContent(
      'collectibles.collateral.protection.status.active'
    );

    mockProfilePeerID = otherPeerID;
    view.rerender(<SourceDepositCollateralFundingSection deposit={baseDeposit} />);

    await waitFor(() => {
      expect(screen.getByTestId('collateral-principal-binding-blocked')).toBeInTheDocument();
      expect(screen.getByTestId('collectible-collateral-protection-badge')).toHaveTextContent(
        'collectibles.collateral.protection.status.declared'
      );
    });

    expect(screen.queryByTestId('collateral-reconcile-funding')).not.toBeInTheDocument();
    expect(screen.queryByTestId('collateral-open-account')).not.toBeInTheDocument();
    expect(mockListAccounts).toHaveBeenCalledTimes(1);
    expect(mockGetCapabilities).toHaveBeenCalledTimes(1);
  });
});
