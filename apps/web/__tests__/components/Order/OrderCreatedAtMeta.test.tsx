import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'zh',
  }),
}));

import { OrderCreatedAtMeta } from '@/components/Order/cards/OrderCreatedAtMeta';

describe('OrderCreatedAtMeta', () => {
  it('formats order time using the active i18n locale', () => {
    render(<OrderCreatedAtMeta createdAt="2026-05-30T12:54:12.000Z" />);

    const meta = screen.getByTestId('order-created-at-meta');
    expect(meta).toHaveTextContent('order.statusCard.orderedAt:');
    expect(meta.textContent).toMatch(/2026.*5.*30.*\d{2}:\d{2}:12/);
    expect(meta.textContent).not.toMatch(/May|PM/i);
  });
});
