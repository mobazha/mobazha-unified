import { describe, expect, it } from 'vitest';
import {
  formatGuestMilestoneDisplay,
  guestOrderMilestones,
  guestOrderMilestonesFromStatus,
  hasGuestTrackingInfo,
  isGuestBuyerOrderPhysical,
  resolveGuestProgressStageIndex,
} from '@/components/orders/guestOrderStages';

describe('guestOrderStages', () => {
  it('maps guest states to progress indices', () => {
    expect(resolveGuestProgressStageIndex('AWAITING_PAYMENT')).toBe(0);
    expect(resolveGuestProgressStageIndex('PAYMENT_DETECTED')).toBe(0);
    expect(resolveGuestProgressStageIndex('FUNDED')).toBe(1);
    expect(resolveGuestProgressStageIndex('SHIPPED')).toBe(2);
    expect(resolveGuestProgressStageIndex('COMPLETED')).toBe(3);
    expect(resolveGuestProgressStageIndex('EXPIRED')).toBe(-1);
  });

  it('builds milestones from timestamps and state', () => {
    const milestones = guestOrderMilestones({
      state: 'SHIPPED',
      fundedAt: '2026-05-18T10:00:00Z',
      shippedAt: '2026-05-19T10:00:00Z',
    });
    expect(milestones.map(m => m.id)).toEqual(['funded', 'shipped']);
  });

  it('detects tracking info on admin detail', () => {
    expect(hasGuestTrackingInfo({ trackingNumber: 'ABC123' })).toBe(true);
    expect(hasGuestTrackingInfo({ shippingCarrier: 'UPS' })).toBe(true);
    expect(hasGuestTrackingInfo({})).toBe(false);
  });

  it('infers buyer physical orders from shipping signals when contract type is missing', () => {
    expect(isGuestBuyerOrderPhysical({ shippingCost: 500 })).toBe(true);
    expect(isGuestBuyerOrderPhysical({ trackingNumber: '1Z999' })).toBe(true);
    expect(isGuestBuyerOrderPhysical({ shippingCarrier: 'UPS' })).toBe(true);
    expect(isGuestBuyerOrderPhysical({})).toBe(false);
    expect(
      isGuestBuyerOrderPhysical({
        items: [{ contractType: 'PHYSICAL_GOOD' }],
      } as never)
    ).toBe(false);
  });

  it('builds buyer milestones from public status', () => {
    const milestones = guestOrderMilestonesFromStatus({
      state: 'SHIPPED',
      fundedAt: '2026-05-18T10:00:00Z',
      shippedAt: '2026-05-19T10:00:00Z',
    });
    expect(milestones.map(m => m.id)).toEqual(['funded', 'shipped']);
    expect(milestones[0]?.labelKey).toBe('guestOrder.milestones.funded');
  });

  it('includes state-inferred milestones without timestamps', () => {
    const milestones = guestOrderMilestonesFromStatus({ state: 'SHIPPED' });
    expect(milestones.map(m => m.id)).toEqual(['funded', 'shipped']);
    expect(formatGuestMilestoneDisplay(undefined, 'pending')).toBe('pending');
  });
});
