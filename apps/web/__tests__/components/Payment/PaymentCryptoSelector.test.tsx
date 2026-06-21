import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PaymentCryptoSelector } from '@/components/Payment/PaymentCryptoSelector';

vi.mock('@/hooks/useMiniAppPayment', () => ({
  useMiniAppPayment: () => ({ isEmbedded: false }),
}));

vi.mock('@mobazha/core', async () => {
  const tokens = await import('../../../../../packages/core/data/tokens');
  const visibility = await import('../../../../../packages/core/config/paymentMethodVisibility');
  const guide = await import('../../../../../packages/core/config/exchangeUsdtPaymentGuide');
  return {
    ...tokens,
    ...visibility,
    ...guide,
    useI18n: () => ({
      locale: 'en',
      t: (key: string, vars?: Record<string, unknown>) =>
        vars?.count !== undefined ? `${key}:${vars.count}` : key,
    }),
    useExchangeUsdtGuideDismiss: () => ({
      dismissed: false,
      dismiss: vi.fn(),
    }),
  };
});

describe('PaymentCryptoSelector', () => {
  it('shows native BNB when accepted payment methods contain the BSC chain id', () => {
    render(
      <PaymentCryptoSelector
        acceptedCurrencies={['BSC']}
        selectedTokenId=""
        onSelect={() => {}}
        showFiatMethods={false}
      />
    );

    expect(screen.getByText('BNB')).toBeInTheDocument();
    expect(screen.queryByText('ETH')).not.toBeInTheDocument();
  });

  it('shows Base native ETH when accepted payment methods contain the BASE chain id', () => {
    render(
      <PaymentCryptoSelector
        acceptedCurrencies={['BASE']}
        selectedTokenId=""
        onSelect={() => {}}
        showFiatMethods={false}
      />
    );

    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.queryByText('BNB')).not.toBeInTheDocument();
  });

  it('hides TRON tokens when TRON checkout is disabled', () => {
    render(
      <PaymentCryptoSelector selectedTokenId="" onSelect={() => {}} showFiatMethods={false} />
    );

    expect(screen.queryByText('TRX')).not.toBeInTheDocument();
    expect(screen.queryByText('TRON')).not.toBeInTheDocument();
  });
});
