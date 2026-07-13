// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CollectiblesNextActionCard } from '@/components/collectibles/experience/CollectiblesNextActionCard';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('CollectiblesNextActionCard', () => {
  it('renders a non-navigable disabled button for disabled href primary actions', () => {
    render(
      <CollectiblesNextActionCard
        title="Next step"
        primaryAction={{
          label: 'Continue',
          href: '/collectibles/redeem/demo',
          disabled: true,
          testId: 'collectibles-primary-action',
        }}
      />
    );

    const button = screen.getByTestId('collectibles-primary-action');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link', { name: 'Continue' })).toBeNull();
  });

  it('renders a navigable link for enabled href primary actions', () => {
    render(
      <CollectiblesNextActionCard
        title="Next step"
        primaryAction={{
          label: 'View redemption',
          href: '/collectibles/redeem/demo',
          testId: 'collectibles-primary-action',
        }}
      />
    );

    const link = screen.getByRole('link', { name: 'View redemption' });
    expect(link).toHaveAttribute('href', '/collectibles/redeem/demo');
  });

  it('renders multiple secondary href actions with stable keys', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CollectiblesNextActionCard
        title="Next step"
        secondaryActions={[
          {
            label: 'View deposit',
            href: '/collectibles/deposit/demo',
            testId: 'collectibles-secondary-deposit',
          },
          {
            label: 'View redemption',
            href: '/collectibles/redeem/demo',
            testId: 'collectibles-secondary-redeem',
          },
        ]}
      />
    );

    expect(screen.getByTestId('collectibles-secondary-deposit')).toBeInTheDocument();
    expect(screen.getByTestId('collectibles-secondary-redeem')).toBeInTheDocument();
    expect(
      errorSpy.mock.calls.some(call =>
        String(call[0]).includes('Each child in a list should have a unique "key" prop')
      )
    ).toBe(false);

    errorSpy.mockRestore();
  });
});
