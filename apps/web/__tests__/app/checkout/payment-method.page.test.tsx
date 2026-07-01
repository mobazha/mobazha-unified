// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const mockUsePaymentMethods = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('paymentPolicy=escrow_crypto_only&vendor=seller-peer'),
}));

vi.mock('@/hooks/useCheckoutSubpageReturn', () => ({
  useCheckoutSubpageReturn: () => ({ navigateBack: vi.fn() }),
}));

vi.mock('@/components/Checkout/CheckoutSubpageHeader', () => ({
  CheckoutSubpageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/Payment', () => ({
  PaymentCryptoSelector: ({ showFiatMethods }: { showFiatMethods?: boolean }) => (
    <div data-testid="payment-crypto-selector" data-show-fiat={String(showFiatMethods)} />
  ),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key, locale: 'en' }),
    usePaymentMethods: (...args: unknown[]) => mockUsePaymentMethods(...args),
  };
});

import PaymentMethodPage from '@/app/checkout/payment-method/page';

describe('PaymentMethodPage payment policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem('checkout_selected_fiat_provider', 'stripe');
    mockUsePaymentMethods.mockReturnValue({
      activeFiat: [{ providerID: 'stripe' }],
      crypto: ['ETH', 'SOLUSDC'],
    });
  });

  it('hides fiat methods and scrubs cached fiat when policy is escrow_crypto_only', () => {
    render(<PaymentMethodPage />);

    expect(screen.getByTestId('checkout-payment-policy-note')).toBeInTheDocument();
    expect(screen.getByTestId('payment-crypto-selector')).toHaveAttribute(
      'data-show-fiat',
      'false'
    );
    expect(sessionStorage.getItem('checkout_selected_fiat_provider')).toBeNull();
  });
});
