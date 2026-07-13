// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  hasCollectibleBuyerOrderContext,
  isCollectibleOrderPaymentVerified,
  resolveCollectibleOrderCustodyAssurance,
  validateSignedOrderCustodyBindings,
} from '../../collectibles/orderCustodyAssurance';
import {
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS,
  COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX,
} from '../../collectibles/orderOptionalFeatures';
import type { Order } from '../../types/order';

function feature(key: string, value: string): string {
  return `${COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX}${key}=${value}`;
}

function buildCollectibleOrder(partial: Partial<Order> = {}): Order {
  return {
    orderID: 'order-collectible-1',
    state: 'AWAITING_PAYMENT',
    funded: false,
    contract: {
      orderOpen: {
        items: [
          {
            listingHash: 'hash-1',
            quantity: 1,
            optionalFeatures: [
              feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-1'),
              feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber, 'PSA-123'),
              feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubLocation, 'source-custody'),
            ],
          },
        ],
      },
    },
    paymentState: {
      fiatMetadata: {
        collectible_type: 'collectible_primary_sale',
        collectible_fulfillment: 'nft',
        collectible_hub_slot_id: 'slot-1',
        collectible_cert_number: 'PSA-123',
      },
    },
    ...partial,
  } as Order;
}

describe('validateSignedOrderCustodyBindings', () => {
  it('ignores partial collateral keys without failing custody validation', () => {
    const order = buildCollectibleOrder({
      contract: {
        orderOpen: {
          items: [
            {
              listingHash: 'hash-1',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.sourceDepositId, 'dep-1'),
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount, '100'),
              ],
            },
          ],
        },
      },
    });

    const validation = validateSignedOrderCustodyBindings(order);
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.bindings.sourceDepositId).toBe('dep-1');
    }
  });

  it('accepts identical duplicate custody keys within a single order item', () => {
    const order = buildCollectibleOrder({
      contract: {
        orderOpen: {
          items: [
            {
              listingHash: 'hash-1',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-1'),
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-1'),
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber, 'PSA-123'),
              ],
            },
          ],
        },
      },
    });

    const validation = validateSignedOrderCustodyBindings(order);
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.bindings.hubSlotId).toBe('slot-1');
    }
  });

  it('accepts identical duplicate custody keys across order items', () => {
    const order = buildCollectibleOrder({
      contract: {
        orderOpen: {
          items: [
            {
              listingHash: 'hash-1',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-1'),
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber, 'PSA-123'),
              ],
            },
            {
              listingHash: 'hash-2',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-1'),
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubLocation, 'source-custody'),
              ],
            },
          ],
        },
      },
    });

    const validation = validateSignedOrderCustodyBindings(order);
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.bindings.hubSlotId).toBe('slot-1');
    }
  });

  it('fails closed on conflicting duplicate custody values within a single order item', () => {
    const order = buildCollectibleOrder({
      contract: {
        orderOpen: {
          items: [
            {
              listingHash: 'hash-1',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-1'),
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-2'),
              ],
            },
          ],
        },
      },
    });

    const validation = validateSignedOrderCustodyBindings(order);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.issue).toBe('conflictingCustodyBinding');
    }
  });

  it('fails closed on conflicting custody values across order items', () => {
    const order = buildCollectibleOrder({
      contract: {
        orderOpen: {
          items: [
            {
              listingHash: 'hash-1',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-1'),
              ],
            },
            {
              listingHash: 'hash-2',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-2'),
              ],
            },
          ],
        },
      },
    });

    const validation = validateSignedOrderCustodyBindings(order);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.issue).toBe('conflictingCustodyBinding');
    }
  });

  it('fails closed when signed hub slot mismatches fiat metadata', () => {
    const order = buildCollectibleOrder({
      contract: {
        orderOpen: {
          items: [
            {
              listingHash: 'hash-1',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-other'),
              ],
            },
          ],
        },
      },
    });

    const validation = validateSignedOrderCustodyBindings(order);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.issue).toBe('hubSlotMismatch');
    }
  });

  it('fails closed when signed cert number mismatches fiat metadata', () => {
    const order = buildCollectibleOrder({
      contract: {
        orderOpen: {
          items: [
            {
              listingHash: 'hash-1',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber, 'PSA-999'),
              ],
            },
          ],
        },
      },
    });

    const validation = validateSignedOrderCustodyBindings(order);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.issue).toBe('certNumberMismatch');
    }
  });

  it('fails closed when signed nft mint mismatches fiat metadata', () => {
    const order = buildCollectibleOrder({
      paymentState: {
        fiatMetadata: {
          collectible_type: 'collectible_primary_sale',
          collectible_fulfillment: 'nft',
          collectible_hub_slot_id: 'slot-1',
          collectible_cert_number: 'PSA-123',
          collectible_nft_mint: 'mint-a',
        },
      },
      contract: {
        orderOpen: {
          items: [
            {
              listingHash: 'hash-1',
              quantity: 1,
              optionalFeatures: [
                feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.nftMint, 'mint-b'),
              ],
            },
          ],
        },
      },
    });

    const validation = validateSignedOrderCustodyBindings(order);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.issue).toBe('nftMintMismatch');
    }
  });

  it('rejects disallowed collectible-prefixed keys', () => {
    const order = buildCollectibleOrder({
      contract: {
        orderOpen: {
          items: [
            {
              listingHash: 'hash-1',
              quantity: 1,
              optionalFeatures: [feature('unsupported_key', 'value')],
            },
          ],
        },
      },
    });

    const validation = validateSignedOrderCustodyBindings(order);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.issue).toBe('disallowedKey');
    }
  });
});

describe('isCollectibleOrderPaymentVerified', () => {
  it('treats order.funded as authoritative payment evidence', () => {
    const fundedActive = buildCollectibleOrder({
      state: 'AWAITING_PAYMENT',
      funded: true,
    });
    const fundedCancelled = buildCollectibleOrder({
      state: 'CANCELED',
      funded: true,
    });

    expect(isCollectibleOrderPaymentVerified(fundedActive)).toBe(true);
    expect(isCollectibleOrderPaymentVerified(fundedCancelled)).toBe(true);
  });
});

describe('resolveCollectibleOrderCustodyAssurance', () => {
  it('returns not visible for non-collectible orders', () => {
    const view = resolveCollectibleOrderCustodyAssurance({
      orderID: 'plain-order',
      state: 'COMPLETED',
    } as Order);

    expect(view.visible).toBe(false);
  });

  it('detects collectible buyer order context from metadata or signed features', () => {
    const order = buildCollectibleOrder();
    expect(hasCollectibleBuyerOrderContext(order)).toBe(true);
  });

  it('uses pending payment copy before payment is verified', () => {
    const view = resolveCollectibleOrderCustodyAssurance(buildCollectibleOrder());

    expect(view.visible).toBe(true);
    expect(view.phase).toBe('pending_payment');
    expect(isCollectibleOrderPaymentVerified(buildCollectibleOrder())).toBe(false);
  });

  it('uses active custody copy for paid collectible orders', () => {
    const view = resolveCollectibleOrderCustodyAssurance(
      buildCollectibleOrder({ state: 'AWAITING_SHIPMENT', funded: true })
    );

    expect(view.phase).toBe('custody_active');
    expect(view.custodyKind).toBe('source');
    expect(isCollectibleOrderPaymentVerified(buildCollectibleOrder({ funded: true }))).toBe(true);
  });

  it('never implies active guarantee for cancelled unpaid terminal orders', () => {
    const view = resolveCollectibleOrderCustodyAssurance(
      buildCollectibleOrder({ state: 'CANCELED', funded: false })
    );

    expect(view.phase).toBe('cancelled_unpaid');
    expect(view.phase).not.toBe('custody_active');
  });

  it('uses cancelled paid semantics for funded cancelled orders', () => {
    const view = resolveCollectibleOrderCustodyAssurance(
      buildCollectibleOrder({
        state: 'CANCELED',
        funded: true,
      })
    );

    expect(view.phase).toBe('cancelled_paid');
    expect(view.phase).not.toBe('custody_active');
  });

  it('uses cancelled paid semantics for refunded orders after payment', () => {
    const view = resolveCollectibleOrderCustodyAssurance(
      buildCollectibleOrder({
        state: 'REFUNDED',
        funded: true,
        paymentState: {
          verificationStatus: 'verified',
          fiatMetadata: buildCollectibleOrder().paymentState?.fiatMetadata,
        },
      })
    );

    expect(view.phase).toBe('cancelled_paid');
    expect(view.phase).not.toBe('custody_active');
  });

  it('never returns custody_active for terminal declined orders even when funded', () => {
    const view = resolveCollectibleOrderCustodyAssurance(
      buildCollectibleOrder({
        state: 'DECLINED',
        funded: true,
      })
    );

    expect(view.phase).toBe('cancelled_paid');
    expect(view.phase).not.toBe('custody_active');
  });

  it('does not fail custody assurance when only partial collateral bindings are present', () => {
    const view = resolveCollectibleOrderCustodyAssurance(
      buildCollectibleOrder({
        contract: {
          orderOpen: {
            items: [
              {
                listingHash: 'hash-1',
                quantity: 1,
                optionalFeatures: [
                  feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.sourceDepositId, 'dep-1'),
                  feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount, '100'),
                ],
              },
            ],
          },
        },
      })
    );

    expect(view.visible).toBe(true);
    expect(view.phase).toBe('pending_payment');
    expect(view.phase).not.toBe('invalid_binding');
  });

  it('fails closed when signed custody bindings conflict across items', () => {
    const view = resolveCollectibleOrderCustodyAssurance(
      buildCollectibleOrder({
        contract: {
          orderOpen: {
            items: [
              {
                listingHash: 'hash-1',
                quantity: 1,
                optionalFeatures: [
                  feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-1'),
                ],
              },
              {
                listingHash: 'hash-2',
                quantity: 1,
                optionalFeatures: [
                  feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId, 'slot-2'),
                ],
              },
            ],
          },
        },
      })
    );

    expect(view.visible).toBe(true);
    expect(view.phase).toBe('invalid_binding');
    expect(view.issue).toBe('conflictingCustodyBinding');
  });

  it('fails closed when signed metadata mismatches fiat metadata', () => {
    const view = resolveCollectibleOrderCustodyAssurance(
      buildCollectibleOrder({
        contract: {
          orderOpen: {
            items: [
              {
                listingHash: 'hash-1',
                quantity: 1,
                optionalFeatures: [
                  feature(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber, 'PSA-999'),
                ],
              },
            ],
          },
        },
      })
    );

    expect(view.phase).toBe('invalid_binding');
    expect(view.issue).toBe('certNumberMismatch');
  });
});
