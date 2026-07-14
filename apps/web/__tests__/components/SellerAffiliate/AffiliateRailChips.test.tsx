// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  };
});

import { AffiliateRailChips } from '@/components/SellerAffiliate/AffiliateRailChips';

const USDC_ON_ETH = 'crypto:eip155:1:erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_ON_BSC = 'crypto:eip155:56:erc20:0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
const ETH_NATIVE = 'crypto:eip155:1:native';
const BNB_NATIVE = 'crypto:eip155:56:native';
const SOL_NATIVE = 'crypto:solana:mainnet:native';

describe('AffiliateRailChips', () => {
  it('groups rails under a chain header so per-chain stablecoins do not read as duplicates', () => {
    render(
      <AffiliateRailChips
        rails={[
          { railID: USDC_ON_BSC },
          { railID: USDC_ON_ETH },
          { railID: BNB_NATIVE },
          { railID: ETH_NATIVE },
          { railID: SOL_NATIVE },
        ]}
      />
    );

    const groups = screen.getAllByTestId('affiliate-rail-chain-group');
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveTextContent('Ethereum');
    expect(groups[1]).toHaveTextContent('BNB Smart Chain');
    expect(groups[2]).toHaveTextContent('Solana');

    // Each chain shows its own USDC exactly once, native asset listed first.
    expect(within(groups[0]).getAllByText('USDC')).toHaveLength(1);
    expect(within(groups[1]).getAllByText('USDC')).toHaveLength(1);
    expect(groups[0].textContent).toMatch(/Ethereum.*ETH.*USDC/);
  });

  it('falls back to the provided label for rails unknown to the local token registry', () => {
    render(
      <AffiliateRailChips rails={[{ railID: 'crypto:unknown:net:native', railLabel: 'Mystery' }]} />
    );
    const group = screen.getByTestId('affiliate-rail-chain-group');
    expect(group).toHaveTextContent('sellerAffiliate.railChainOther');
    expect(group).toHaveTextContent('Mystery');
  });

  it('marks rails that support guest checkout', () => {
    render(<AffiliateRailChips rails={[{ railID: ETH_NATIVE, guestSupport: true }]} />);
    expect(screen.getByTestId('affiliate-rail-chain-group')).toHaveTextContent(
      'sellerAffiliate.guestSupported'
    );
  });

  it('renders nothing for an empty rail list', () => {
    const { container } = render(<AffiliateRailChips rails={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
