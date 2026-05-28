import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'guestOrder.stages.payment': 'Payment',
        'guestOrder.stages.paid': 'Paid',
        'guestOrder.stages.delivered': 'Delivered',
        'guestOrder.stages.deliveredGeneric': 'Fulfillment',
        'guestOrder.stages.shipped': 'Shipped',
        'guestOrder.stages.complete': 'Complete',
        'guestOrder.stages.expired': 'Expired',
        'guestOrder.stageProgress': `Step ${params?.current} of ${params?.total}`,
      };
      return translations[key] ?? key;
    },
  }),
}));

import { GuestOrderStageStrip } from '@/components/orders/GuestOrderStageStrip';

describe('GuestOrderStageStrip', () => {
  it('highlights funded as step 2 for digital orders', () => {
    render(<GuestOrderStageStrip state="FUNDED" orderKind="digital" />);
    expect(screen.getByTestId('guest-order-stage-strip')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('uses shipped label for physical orders', () => {
    render(<GuestOrderStageStrip state="SHIPPED" orderKind="physical" />);
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
  });

  it('uses neutral fulfillment label when order kind is unknown', () => {
    render(<GuestOrderStageStrip state="FUNDED" orderKind="unknown" />);
    expect(screen.getByText('Fulfillment')).toBeInTheDocument();
  });

  it('shows expired banner', () => {
    render(<GuestOrderStageStrip state="EXPIRED" orderKind="unknown" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.queryByTestId('guest-order-stage-strip')).not.toBeInTheDocument();
  });
});
