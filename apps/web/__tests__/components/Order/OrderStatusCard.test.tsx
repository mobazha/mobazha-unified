import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

import type { DisplayOrder } from '@mobazha/core';
import { OrderStatusCard } from '@/components/Order/cards/OrderStatusCard';

function makeOrder(overrides: Partial<DisplayOrder> = {}): DisplayOrder {
  return {
    id: 'order-1',
    orderId: 'order-1',
    status: 'paid',
    items: [],
    total: '15.00',
    currency: 'ETH',
    paymentCoin: 'crypto:eip155:11155111:native',
    paymentAmount: '0.007',
    createdAt: '2026-05-19T00:00:00Z',
    vendor: {
      id: 'vendor-1',
      name: 'Vendor',
      avatar: '',
    },
    buyer: {
      id: 'buyer-1',
      name: 'Buyer',
      avatar: '',
    },
    shippingAddress: '',
    timeline: [],
    userRole: 'buyer',
    ...overrides,
  } as DisplayOrder;
}

describe('OrderStatusCard', () => {
  it('does not show on-chain confirming hint once a crypto order is already paid', () => {
    render(<OrderStatusCard displayOrder={makeOrder({ status: 'paid' })} />);

    expect(screen.getByText('order.statusCard.pendingBuyer')).toBeInTheDocument();
    expect(screen.getByText('order.statusCard.pendingBuyerPaidHint')).toBeInTheDocument();
    expect(
      screen.queryByText('order.statusCard.pendingBuyerConfirmingHint')
    ).not.toBeInTheDocument();
  });

  it('shows on-chain confirming hint only while awaiting payment verification', () => {
    render(
      <OrderStatusCard
        displayOrder={makeOrder({
          status: 'awaiting_payment',
          awaitingPaymentVerification: true,
        })}
      />
    );

    expect(screen.getByText('order.statusCard.pendingBuyer')).toBeInTheDocument();
    expect(screen.getByText('order.statusCard.pendingBuyerConfirmingHint')).toBeInTheDocument();
  });
});
