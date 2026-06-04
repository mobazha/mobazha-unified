import { describe, expect, it } from 'vitest';
import {
  getAcceptSuccessDescKey,
  getCompleteDialogDescriptionKey,
  getDeliveredBuyerStatusKey,
  getDeliveredSellerStatusKey,
  getFulfillmentStepLabelKey,
  getOrderListShippedLabelKey,
  getShipActionLabelKey,
  getCompleteActionLabelKey,
  getCompleteDialogTitleKey,
  getShippedStatusLabelKey,
  getShippedBuyerStatusKey,
  getShipSuccessDescKey,
  getShipSuccessTitleKey,
  isServiceOrder,
} from '../../utils/orderFulfillmentLabels';

describe('orderFulfillmentLabels', () => {
  it('uses ship terminology for physical goods', () => {
    expect(getFulfillmentStepLabelKey('PHYSICAL_GOOD')).toBe('order.statusCard.stepShipped');
    expect(getShipActionLabelKey('PHYSICAL_GOOD')).toBe('order.actions.ship');
    expect(getShipSuccessTitleKey(undefined)).toBe('order.actions.shipSuccess');
    expect(getOrderListShippedLabelKey('PHYSICAL_GOOD')).toBe('order.shipped');
  });

  it('uses deliver terminology for service orders', () => {
    expect(isServiceOrder('SERVICE')).toBe(true);
    expect(getFulfillmentStepLabelKey('SERVICE')).toBe('order.statusCard.stepDelivered');
    expect(getShipActionLabelKey('SERVICE')).toBe('order.actions.deliverService');
    expect(getShippedBuyerStatusKey('SERVICE')).toBe('order.statusCard.shippedBuyerService');
    expect(getAcceptSuccessDescKey('SERVICE')).toBe('order.actions.acceptSuccessDescService');
    expect(getShipSuccessDescKey('SERVICE')).toBe('order.actions.shipSuccessDescService');
    expect(getOrderListShippedLabelKey('SERVICE')).toBe('order.serviceDelivered');
    expect(getCompleteActionLabelKey('SERVICE')).toBe('order.actions.completeService');
    expect(getCompleteDialogTitleKey('SERVICE')).toBe('order.dialogs.completeOrder.titleService');
    expect(getShippedStatusLabelKey('SERVICE')).toBe('order.serviceDelivered');
  });

  it('uses deliver terminology for digital goods', () => {
    expect(getFulfillmentStepLabelKey('DIGITAL_GOOD')).toBe('order.statusCard.stepDelivered');
    expect(getShipActionLabelKey('DIGITAL_GOOD', { canSyncDigitalDelivery: true })).toBe(
      'order.actions.syncDelivery'
    );
    expect(getShippedBuyerStatusKey('DIGITAL_GOOD')).toBe('order.statusCard.shippedBuyerDigital');
    expect(getOrderListShippedLabelKey('DIGITAL_GOOD')).toBe('order.digitalDelivered');
    expect(getCompleteActionLabelKey('DIGITAL_GOOD')).toBe('order.actions.completeDigital');
    expect(getCompleteDialogTitleKey('DIGITAL_GOOD')).toBe(
      'order.dialogs.completeOrder.titleDigital'
    );
  });

  it('returns contract-type-specific complete dialog descriptions', () => {
    expect(getCompleteDialogDescriptionKey('SERVICE')).toBe(
      'order.dialogs.completeOrder.descriptionService'
    );
    expect(getCompleteDialogDescriptionKey('SERVICE', true)).toBe(
      'order.dialogs.completeOrder.moderatedDescriptionService'
    );
    expect(getCompleteDialogDescriptionKey('DIGITAL_GOOD', true)).toBe(
      'order.dialogs.completeOrder.moderatedDescriptionDigital'
    );
    expect(getCompleteDialogDescriptionKey(undefined, true)).toBe(
      'order.dialogs.completeOrder.moderatedDescription'
    );
  });

  it('returns contract-type-specific delivered status keys', () => {
    expect(getDeliveredSellerStatusKey('SERVICE')).toBe('order.statusCard.deliveredSellerService');
    expect(getDeliveredBuyerStatusKey('DIGITAL_GOOD')).toBe(
      'order.statusCard.deliveredBuyerDigital'
    );
    expect(getDeliveredSellerStatusKey(undefined)).toBe('order.statusCard.deliveredSeller');
  });
});
