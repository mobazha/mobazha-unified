import { describe, expect, it } from 'vitest';
import {
  buildAcceptDisputeSettlementContext,
  escrowTypeUsesBackendSubmittedSettlement,
  orderUsesCancelableBackendSettlement,
  orderUsesMonitoredBackendSettlement,
} from '../../utils/orderSettlement';

describe('orderSettlement helpers', () => {
  it('keeps private backend-submitted settlement providers disabled', () => {
    expect(escrowTypeUsesBackendSubmittedSettlement('private_provider')).toBe(false);
    expect(escrowTypeUsesBackendSubmittedSettlement('utxo_script')).toBe(false);
    expect(escrowTypeUsesBackendSubmittedSettlement(undefined)).toBe(false);
  });

  it('keeps monitored backend settlement disabled for moderated orders', () => {
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        escrowType: 'private_provider',
      })
    ).toBe(false);
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        escrowType: 'utxo_script',
      })
    ).toBe(false);
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: false,
        escrowType: 'private_provider',
      })
    ).toBe(false);
  });

  it('requires escrow type for moderated backend settlement', () => {
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        paymentCoin: 'crypto:eip155:1:native',
      })
    ).toBe(false);
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        settlementSpec: { escrowType: 'utxo_script', method: 'MODERATED' },
      })
    ).toBe(false);
  });

  it('keeps cancelable backend settlement disabled', () => {
    expect(
      orderUsesCancelableBackendSettlement({
        paymentProductMode: 'cancelable',
        escrowType: 'private_provider',
      })
    ).toBe(false);
    expect(
      orderUsesCancelableBackendSettlement({
        paymentProductMode: 'moderated',
        escrowType: 'private_provider',
      })
    ).toBe(false);
  });

  it('requires escrow type for cancelable backend settlement', () => {
    expect(
      orderUsesCancelableBackendSettlement({
        paymentProductMode: 'cancelable',
        paymentCoin: 'crypto:eip155:1:native',
      })
    ).toBe(false);
    expect(
      orderUsesCancelableBackendSettlement({
        paymentProductMode: 'cancelable',
        escrowType: 'utxo_script',
      })
    ).toBe(false);
  });

  it('builds accept dispute context with escrow type', () => {
    expect(
      buildAcceptDisputeSettlementContext({
        paymentCoin: 'crypto:eip155:1:native',
        isModerated: true,
        settlementSpec: { escrowType: 'private_provider', method: 'MODERATED' },
      })
    ).toEqual({
      paymentCoin: 'crypto:eip155:1:native',
      isModerated: true,
      escrowType: 'private_provider',
    });
  });

  it('detects moderated settlement from escrowType without paymentCoin', () => {
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        escrowType: 'utxo_script',
      })
    ).toBe(false);
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        paymentCoin: 'crypto:eip155:1:native',
      })
    ).toBe(false);
  });
});
