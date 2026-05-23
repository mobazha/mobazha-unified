import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/Order', () => ({
  OrderCompleteCard: (props: {
    title?: string;
    txHash?: string;
    description?: string;
    timestamp?: string;
  }) => (
    <div data-testid="complete-card">
      <span>{props.title || 'order.stages.complete'}</span>
      <span>{props.txHash}</span>
      <span>{props.description}</span>
      <span>{props.timestamp}</span>
    </div>
  ),
  ShipmentCard: (props: { timestamp?: string }) => (
    <div data-testid="shipment-card">{props.timestamp}</div>
  ),
  AcceptedCard: (props: { timestamp?: string }) => (
    <div data-testid="accepted-card">{props.timestamp}</div>
  ),
}));

vi.mock('@/components/Order/utils', () => ({
  getBlockExplorerUrl: () => undefined,
}));

import type { DisplayOrder } from '@mobazha/core';
import { OrderTimelineCard } from '@/components/Order/cards/OrderTimelineCard';

function makeOrder(overrides: Partial<DisplayOrder> = {}): DisplayOrder {
  return {
    id: 'order-1',
    orderId: 'order-1',
    status: 'completed',
    items: [],
    total: '0.033',
    currency: 'ETH',
    paymentCoin: 'crypto:eip155:11155111:native',
    paymentAmount: '0.033',
    createdAt: '2026-05-15T00:00:00Z',
    vendor: { id: 'vendor-1', name: 'Vendor', avatar: '' },
    buyer: { id: 'buyer-1', name: 'Buyer', avatar: '' },
    shippingAddress: '',
    timeline: [
      {
        status: 'paid',
        timestamp: '2026-05-15T00:01:00Z',
        description: 'paid',
        descriptionKey: 'order.timeline.fundsSecured',
      },
      {
        status: 'processing',
        timestamp: '2026-05-15T00:02:00Z',
        description: 'accepted',
        descriptionKey: 'order.timeline.vendorConfirmed',
      },
      {
        status: 'released',
        timestamp: '2026-05-15T00:03:00Z',
        description: 'released',
        descriptionKey: 'order.timeline.fundsReleased',
      },
      {
        status: 'shipped',
        timestamp: '2026-05-15T00:04:00Z',
        description: 'shipped',
        descriptionKey: 'order.timeline.packageShipped',
      },
      {
        status: 'completed',
        timestamp: '2026-05-15T00:05:00Z',
        description: 'completed',
        descriptionKey: 'order.timeline.orderCompleted',
      },
    ],
    userRole: 'buyer',
    paymentTx: '0xpayment1234567890abcdef',
    releaseTx: '0xrelease1234567890abcdef',
    fundsReleasedAtConfirmation: true,
    ...overrides,
  } as DisplayOrder;
}

describe('OrderTimelineCard', () => {
  it('renders payment and release as separate consistently ordered timeline cards', () => {
    render(<OrderTimelineCard displayOrder={makeOrder()} />);

    const completeCards = screen.getAllByTestId('complete-card');
    expect(completeCards[0]).toHaveTextContent('order.stages.complete');
    expect(completeCards[0]).toHaveTextContent('order.timeline.orderCompleted');

    expect(screen.getByTestId('shipment-card')).toHaveTextContent('2026-05-15T00:04:00Z');

    expect(completeCards[1]).toHaveTextContent('order.stages.released');
    expect(completeCards[1]).toHaveTextContent('0xrelease1234567890abcdef');
    expect(completeCards[1]).toHaveTextContent('order.timeline.fundsReleased');

    expect(screen.getByTestId('accepted-card')).toHaveTextContent('2026-05-15T00:02:00Z');

    expect(completeCards[2]).toHaveTextContent('order.stages.escrowed');
    expect(completeCards[2]).toHaveTextContent('0xpayment1234567890abcdef');
    expect(completeCards[2]).toHaveTextContent('order.timeline.fundsSecured');
  });

  it('renders funded cancelled orders with payment, decline, and refund cards', () => {
    render(
      <OrderTimelineCard
        displayOrder={makeOrder({
          status: 'cancelled',
          cancellation: {
            kind: 'seller_decline',
            wasFunded: true,
            refundConfirmed: true,
          },
          timeline: [
            {
              status: 'paid',
              timestamp: '2026-05-15T00:01:00Z',
              description: 'paid',
              descriptionKey: 'order.timeline.fundsSecured',
            },
            {
              status: 'cancelled',
              timestamp: '2026-05-15T00:02:00Z',
              description: 'declined',
              descriptionKey: 'order.timeline.orderDeclined',
            },
          ],
        })}
        settlementAction={{
          actionId: 'action-1',
          action: 'cancel',
          settlementAction: 'cancel',
          state: 'confirmed',
          txHash: '0xrefund1234567890abcdef',
          updatedAt: '2026-05-15T00:03:00Z',
        }}
      />
    );

    const completeCards = screen.getAllByTestId('complete-card');
    expect(completeCards).toHaveLength(3);
    expect(completeCards[0]).toHaveTextContent('order.timeline.refunded');
    expect(completeCards[0]).toHaveTextContent('0xrefund1234567890abcdef');
    expect(completeCards[1]).toHaveTextContent('order.timeline.orderDeclined');
    expect(completeCards[2]).toHaveTextContent('order.stages.escrowed');
    expect(completeCards[2]).toHaveTextContent('0xpayment1234567890abcdef');
  });
});
