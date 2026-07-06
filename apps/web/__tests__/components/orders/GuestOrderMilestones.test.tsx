import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { GuestOrderStatus } from '@mobazha/core/services/api/guestCheckout';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'guestOrder.milestonesTitle': 'Order timeline',
        'guestOrder.milestones.funded': 'Payment confirmed',
        'guestOrder.milestones.shipped': 'Shipped',
        'guestOrder.milestones.delivered': 'Delivered',
        'guestOrder.milestones.timePending': 'Time pending',
      };
      return translations[key] ?? key;
    },
  }),
}));

import { GuestOrderMilestones } from '@/components/orders/GuestOrderMilestones';

const shippedOrder: GuestOrderStatus = {
  orderToken: 'tok',
  state: 'SHIPPED',
  paymentAddress: 'addr',
  paymentAmount: '100',
  paymentCoin: 'BTC',
  priceCurrency: 'USD',
  priceDivisibility: 2,
  confirmations: 6,
  requiredConfs: 1,
  expiresAt: '2026-05-18T12:00:00Z',
  createdAt: '2026-05-18T12:00:00Z',
  updatedAt: '2026-05-19T12:00:00Z',
  items: [],
  fundedAt: '2026-05-18T13:00:00.000Z',
  shippedAt: '2026-05-19T10:00:00.000Z',
};

describe('GuestOrderMilestones', () => {
  it('renders milestone rows when timestamps exist', () => {
    render(<GuestOrderMilestones order={shippedOrder} />);
    expect(screen.getByTestId('guest-order-milestones')).toBeInTheDocument();
    expect(screen.getByText('Order timeline')).toBeInTheDocument();
    expect(screen.getByText('Payment confirmed')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('uses delivered milestone language for service orders', () => {
    render(<GuestOrderMilestones order={shippedOrder} orderKind="service" />);
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.queryByText('Shipped')).not.toBeInTheDocument();
  });

  it('shows pending label when milestone state exists without timestamps', () => {
    render(
      <GuestOrderMilestones
        order={{
          ...shippedOrder,
          fundedAt: undefined,
          shippedAt: undefined,
        }}
      />
    );
    expect(screen.getByTestId('guest-order-milestones')).toBeInTheDocument();
    expect(screen.getAllByText('Time pending')).toHaveLength(2);
  });

  it('returns null when no milestones apply to state', () => {
    const { container } = render(
      <GuestOrderMilestones
        order={{
          ...shippedOrder,
          state: 'AWAITING_PAYMENT',
          fundedAt: undefined,
          shippedAt: undefined,
        }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
