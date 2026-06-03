import { describe, expect, it } from 'vitest';
import {
  formatDigitalEntitlementRestrictedReason,
  formatDisputeMoneyAmount,
  getDisputeEscrowTotalLabel,
  getDisputeReleaseTxHash,
  getDisputeResolutionHeadline,
  getDisputeSettlementPayoutLines,
  isActiveCryptoDisputeStatus,
  isDisputeRulingAvailable,
  resolveDigitalEntitlementDisputePhase,
  shouldHideSellerDigitalInProgress,
  shouldShowDisputeArchiveCard,
} from '../../utils/disputeRulingDisplay';

const ETH_COIN = 'crypto:eip155:1:native';

const t = (key: string, params?: Record<string, string | number>) => {
  if (key === 'order.disputeOverview.payoutSplit' && params) {
    return `Buyer ${params.buyerPercent}% · Seller ${params.vendorPercent}%`;
  }
  const labels: Record<string, string> = {
    'order.buyer': 'Buyer',
    'order.seller': 'Seller',
    'order.platformFee': 'Platform fee',
    'order.networkFee': 'Network fee',
    'order.disputeOverview.resolvedFavor': `Resolved in favor of ${params?.party ?? ''}`,
    'order.disputeOverview.resolvedSplit': 'Funds split between parties',
    'order.disputeDisplay.buyerReceives': 'Buyer receives',
    'order.disputeDisplay.sellerReceives': 'Seller receives',
    'order.disputeDisplay.moderatorFee': 'Moderator fee',
    'order.digital.disputeFrozenNote': 'Dispute frozen note',
    'order.digital.disputeRevokedAfterSplit': 'Revoked after split',
    'order.digital.disputeRevokedBuyerWon': 'Revoked buyer won',
    'order.digital.disputeRevokedSellerWon': 'Revoked seller won',
    'order.digital.disputeResolvedRestoring': 'Restoring access',
    'order.digital.restrictedReason.revoked': 'Access was revoked',
  };
  return labels[key] ?? key;
};

describe('disputeRulingDisplay', () => {
  it('isDisputeRulingAvailable detects resolved disputes', () => {
    expect(isDisputeRulingAvailable(null)).toBe(false);
    expect(isDisputeRulingAvailable({ status: 'open' })).toBe(false);
    expect(isDisputeRulingAvailable({ status: 'resolved' })).toBe(true);
    expect(isDisputeRulingAvailable({ resolutionText: 'Explanation only' })).toBe(true);
  });

  it('getDisputeResolutionHeadline prefers custom split percentages', () => {
    expect(
      getDisputeResolutionHeadline(
        { resolution: 'split', buyerPayoutPercent: 70, vendorPayoutPercent: 30 },
        t
      )
    ).toBe('Buyer 70% · Seller 30%');
  });

  it('getDisputeResolutionHeadline uses generic split label for 50/50', () => {
    expect(
      getDisputeResolutionHeadline(
        { resolution: 'split', buyerPayoutPercent: 50, vendorPayoutPercent: 50 },
        t
      )
    ).toBe('Funds split between parties');
  });

  it('isActiveCryptoDisputeStatus covers disputed and decided only', () => {
    expect(isActiveCryptoDisputeStatus('disputed')).toBe(true);
    expect(isActiveCryptoDisputeStatus('decided')).toBe(true);
    expect(isActiveCryptoDisputeStatus('completed')).toBe(false);
  });

  it('shouldShowDisputeArchiveCard when ruling exists and order is completed', () => {
    expect(
      shouldShowDisputeArchiveCard(
        { status: 'resolved', buyerPayoutPercent: 59, vendorPayoutPercent: 41 },
        'completed'
      )
    ).toBe(true);
    expect(
      shouldShowDisputeArchiveCard(
        { status: 'resolved', buyerPayoutPercent: 59, vendorPayoutPercent: 41 },
        'decided'
      )
    ).toBe(false);
  });

  it('getDisputeSettlementPayoutLines prefers dispute ruling over partial settlement_action lines', () => {
    const lines = getDisputeSettlementPayoutLines(
      {
        id: '1',
        claim: 'test',
        status: 'resolved',
        initiator: 'buyer',
        buyerPayoutAmount: '0.009236163984000514',
        vendorPayoutAmount: '0.006157442656000344',
        moderatorPayoutAmount: '0.000155490976161624',
      },
      {
        source: 'settlement_action',
        currency: ETH_COIN,
        escrowedAmount: '15549097616162482',
        lines: [
          { type: 'seller', amount: '15281009726228647' },
          { type: 'platform', amount: '26808788933835' },
        ],
      },
      t,
      { paymentCoin: ETH_COIN }
    );

    expect(lines.map(line => line.label)).toEqual([
      'Buyer receives',
      'Seller receives',
      'Moderator fee',
    ]);
    expect(lines.every(line => !line.amount.includes('crypto:'))).toBe(true);
    expect(lines.every(line => line.amount.includes('ETH'))).toBe(true);
  });

  it('getDisputeSettlementPayoutLines uses settlement lines when no dispute snapshot exists', () => {
    const lines = getDisputeSettlementPayoutLines(
      {
        id: '1',
        claim: 'test',
        status: 'resolved',
        initiator: 'buyer',
      },
      {
        source: 'settlement_action',
        currency: 'ETH',
        escrowedAmount: '0.01555',
        lines: [
          { type: 'buyer', amount: '0.009 ETH' },
          { type: 'seller', amount: '0.006 ETH' },
          { type: 'moderator', amount: '0.0001 ETH' },
          { type: 'platform', amount: '0.0005 ETH' },
          { type: 'network_fee', amount: '0.0002 ETH' },
        ],
      },
      t
    );

    expect(lines).toHaveLength(5);
    expect(lines.find(line => line.label === 'Platform fee')?.amount).toBe('0.0005 ETH');
    expect(lines.find(line => line.label === 'Network fee')?.amount).toBe('0.0002 ETH');
  });

  it('getDisputeSettlementPayoutLines falls back to dispute amounts and breakdown fees', () => {
    const lines = getDisputeSettlementPayoutLines(
      {
        id: '1',
        claim: 'test',
        status: 'resolved',
        initiator: 'buyer',
        buyerPayoutAmount: '0.009 ETH',
        vendorPayoutAmount: '0.006 ETH',
        moderatorPayoutAmount: '0.0001 ETH',
      },
      {
        source: 'dispute',
        currency: 'ETH',
        platformAmount: '0.0005 ETH',
        transactionFee: '0.0002 ETH',
      },
      t
    );

    expect(lines.map(line => line.label)).toEqual([
      'Buyer receives',
      'Seller receives',
      'Moderator fee',
      'Platform fee',
      'Network fee',
    ]);
  });

  it('getDisputeEscrowTotalLabel formats escrow total with human symbol', () => {
    const label = getDisputeEscrowTotalLabel(
      {
        currency: ETH_COIN,
        escrowedAmount: '0.015549097616162482 crypto:eip155:1:native',
      },
      { paymentCoin: ETH_COIN }
    );
    expect(label).toBe('0.01555 ETH');
    expect(label).not.toContain('crypto:');
  });

  it('formatDisputeMoneyAmount strips CAIP suffix and uses ETH label', () => {
    const formatted = formatDisputeMoneyAmount(
      '0.015549097616162482 crypto:eip155:1:native',
      ETH_COIN
    );
    expect(formatted).toBe('0.01555 ETH');
    expect(formatted).not.toContain('crypto:');
  });

  it('resolveDigitalEntitlementDisputePhase maps order status + dispute', () => {
    const dispute = {
      status: 'resolved' as const,
      buyerPayoutPercent: 59,
      vendorPayoutPercent: 41,
    };
    expect(resolveDigitalEntitlementDisputePhase('disputed', dispute)).toBe('active');
    expect(resolveDigitalEntitlementDisputePhase('decided', dispute)).toBe('active');
    expect(resolveDigitalEntitlementDisputePhase('completed', dispute)).toBe('resolved');
    expect(resolveDigitalEntitlementDisputePhase('completed', null)).toBe('none');
  });

  it('shouldHideSellerDigitalInProgress hides stale pending on completed orders', () => {
    expect(
      shouldHideSellerDigitalInProgress({
        status: 'pending',
        orderStatus: 'completed',
        disputePhase: 'none',
        orderInDispute: false,
        isDelivered: false,
      })
    ).toBe(true);
    expect(
      shouldHideSellerDigitalInProgress({
        status: 'delivered',
        orderStatus: 'completed',
        disputePhase: 'resolved',
        orderInDispute: false,
        isDelivered: true,
      })
    ).toBe(false);
  });

  it('formatDigitalEntitlementRestrictedReason uses split-specific copy after ruling', () => {
    expect(
      formatDigitalEntitlementRestrictedReason('revoked', t, {
        disputePhase: 'resolved',
        resolution: 'split',
        buyerPayoutPercent: 59,
      })
    ).toBe('Revoked after split');
  });

  it('getDisputeReleaseTxHash prefers settlement action tx hash', () => {
    expect(
      getDisputeReleaseTxHash(
        { source: 'settlement_action', txHash: '0xabc', currency: 'ETH' },
        '0xlegacy'
      )
    ).toBe('0xabc');
    expect(getDisputeReleaseTxHash(undefined, '0xlegacy')).toBe('0xlegacy');
  });
});
