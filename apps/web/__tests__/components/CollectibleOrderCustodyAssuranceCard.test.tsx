// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CollectibleOrderCustodyAssuranceCard } from '@/components/collectibles/CollectibleOrderCustodyAssuranceCard';
import {
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS,
  COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX,
  type Order,
} from '@mobazha/core';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en',
    }),
  };
});

function feature(key: string, value: string): string {
  return `${COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX}${key}=${value}`;
}

function buildOrder(partial: Partial<Order> = {}): Order {
  return {
    orderID: 'order-1',
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

describe('CollectibleOrderCustodyAssuranceCard', () => {
  it('renders pending payment custody copy without collateral terminology', () => {
    render(<CollectibleOrderCustodyAssuranceCard orderId="order-1" coreOrder={buildOrder()} />);

    expect(screen.getByTestId('collectible-order-custody-assurance')).toBeInTheDocument();
    expect(screen.getByText('collectibles.custody.order.pendingPaymentTitle')).toBeInTheDocument();
    expect(screen.getByTestId('collectible-order-custody-body')).toHaveTextContent(
      'collectibles.custody.order.pendingPaymentBody'
    );
    expect(screen.queryByText(/collateral/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/allocation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guarantee/i)).not.toBeInTheDocument();
  });

  it('renders cancelled unpaid semantics for terminal unpaid orders', () => {
    render(
      <CollectibleOrderCustodyAssuranceCard
        orderId="order-1"
        coreOrder={buildOrder({ state: 'CANCELED', funded: false })}
      />
    );

    expect(screen.getByText('collectibles.custody.order.cancelledUnpaidTitle')).toBeInTheDocument();
    expect(screen.getByTestId('collectible-order-custody-body')).toHaveTextContent(
      'collectibles.custody.order.cancelledUnpaidBody'
    );
    expect(screen.queryByTestId('collectible-order-custody-badge')).not.toBeInTheDocument();
  });

  it('renders cancelled paid semantics for funded terminal orders', () => {
    render(
      <CollectibleOrderCustodyAssuranceCard
        orderId="order-1"
        coreOrder={buildOrder({ state: 'CANCELED', funded: true })}
      />
    );

    expect(screen.getByText('collectibles.custody.order.cancelledPaidTitle')).toBeInTheDocument();
    expect(screen.getByTestId('collectible-order-custody-body')).toHaveTextContent(
      'collectibles.custody.order.cancelledPaidBody'
    );
    expect(screen.queryByTestId('collectible-order-custody-badge')).not.toBeInTheDocument();
  });

  it('renders active custody semantics and source badge for paid orders', () => {
    render(
      <CollectibleOrderCustodyAssuranceCard
        orderId="order-1"
        coreOrder={buildOrder({
          state: 'AWAITING_SHIPMENT',
          funded: true,
          paymentState: {
            verificationStatus: 'verified',
            fiatMetadata: buildOrder().paymentState?.fiatMetadata,
          },
        })}
      />
    );

    expect(screen.getByText('collectibles.custody.order.activeTitle')).toBeInTheDocument();
    expect(screen.getByTestId('collectible-order-custody-body')).toHaveTextContent(
      'collectibles.custody.order.activeBody'
    );
    expect(screen.getByTestId('collectible-order-custody-badge')).toHaveTextContent(
      'collectibles.catalog.custody.sourceCustody'
    );
  });

  it('fails closed with plain-language invalid custody message', () => {
    render(
      <CollectibleOrderCustodyAssuranceCard
        orderId="order-1"
        coreOrder={buildOrder({
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
        })}
      />
    );

    expect(screen.getByText('collectibles.custody.order.invalidTitle')).toBeInTheDocument();
    expect(screen.getByTestId('collectible-order-custody-body')).toHaveTextContent(
      'collectibles.custody.order.invalidBody'
    );
  });

  it('does not fail when partial collateral bindings are present', () => {
    render(
      <CollectibleOrderCustodyAssuranceCard
        orderId="order-1"
        coreOrder={buildOrder({
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
        })}
      />
    );

    expect(screen.getByText('collectibles.custody.order.pendingPaymentTitle')).toBeInTheDocument();
    expect(screen.queryByText('collectibles.custody.order.invalidTitle')).not.toBeInTheDocument();
  });
});
