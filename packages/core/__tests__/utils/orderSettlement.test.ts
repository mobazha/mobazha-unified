import { describe, expect, it } from 'vitest';
import {
  buildAcceptDisputeSettlementContext,
  escrowTypeUsesBackendSubmittedSettlement,
  orderUsesCancelableBackendSettlement,
  orderUsesMonitoredBackendSettlement,
} from '../../utils/orderSettlement';

describe('orderSettlement helpers', () => {
  it('treats non-empty backend settlement types as opaque instructions', () => {
    expect(escrowTypeUsesBackendSubmittedSettlement('managed_escrow')).toBe(true);
    expect(escrowTypeUsesBackendSubmittedSettlement('utxo_script')).toBe(true);
    expect(escrowTypeUsesBackendSubmittedSettlement('')).toBe(false);
    expect(escrowTypeUsesBackendSubmittedSettlement('   ')).toBe(false);
  });

  it('requires moderated + backend-submitted escrow for monitored backend settlement', () => {
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        escrowType: 'managed_escrow',
      })
    ).toBe(true);
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        escrowType: 'utxo_script',
      })
    ).toBe(true);
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: false,
        escrowType: 'managed_escrow',
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
    ).toBe(true);
  });

  it('requires cancelable product mode for confirm/cancel settlement', () => {
    expect(
      orderUsesCancelableBackendSettlement({
        paymentProductMode: 'cancelable',
        escrowType: 'managed_escrow',
      })
    ).toBe(true);
    expect(
      orderUsesCancelableBackendSettlement({
        paymentProductMode: 'moderated',
        escrowType: 'managed_escrow',
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
    ).toBe(true);
  });

  it('builds accept dispute context with escrow type', () => {
    expect(
      buildAcceptDisputeSettlementContext({
        paymentCoin: 'crypto:eip155:1:native',
        isModerated: true,
        settlementSpec: { escrowType: 'managed_escrow', method: 'MODERATED' },
      })
    ).toEqual({
      paymentCoin: 'crypto:eip155:1:native',
      isModerated: true,
      escrowType: 'managed_escrow',
    });
  });

  it('detects moderated settlement from escrowType without paymentCoin', () => {
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        escrowType: 'utxo_script',
      })
    ).toBe(true);
    expect(
      orderUsesMonitoredBackendSettlement({
        isModerated: true,
        paymentCoin: 'crypto:eip155:1:native',
      })
    ).toBe(false);
  });
});
