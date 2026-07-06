import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const ordersSalesPanel = vi.fn(
  ({ shell, defaultSource, sovereignSellerOnly }: Record<string, unknown>) => (
    <div
      data-testid="sovereign-orders"
      data-shell={String(shell)}
      data-default-source={String(defaultSource)}
      data-seller-only={String(sovereignSellerOnly)}
    />
  )
);

vi.mock('@/components/orders/OrdersSalesPanel', () => ({
  OrdersSalesPanel: ordersSalesPanel,
}));

describe('Orders page in sovereign builds', () => {
  it('reuses the canonical sales panel with guest-first seller-only defaults', async () => {
    const { default: SovereignAdminOrdersPage } = await import('@/app/admin/orders/page_sovereign');

    render(<SovereignAdminOrdersPage />);

    const panel = screen.getByTestId('sovereign-orders');
    expect(panel).toHaveAttribute('data-shell', 'admin');
    expect(panel).toHaveAttribute('data-default-source', 'guest');
    expect(panel).toHaveAttribute('data-seller-only', 'true');
  });
});
