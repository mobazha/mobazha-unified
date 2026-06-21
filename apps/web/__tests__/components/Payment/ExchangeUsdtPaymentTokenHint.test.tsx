import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExchangeUsdtPaymentTokenHint } from '@/components/Payment/ExchangeUsdtPaymentTokenHint';

vi.mock('@mobazha/core', async () => {
  const guide = await import('../../../../../packages/core/config/exchangeUsdtPaymentGuide');
  return {
    ...guide,
    useI18n: () => ({
      locale: 'zh',
      t: (key: string) => key,
    }),
  };
});

describe('ExchangeUsdtPaymentTokenHint', () => {
  it('renders hint for supported USDT token', () => {
    render(<ExchangeUsdtPaymentTokenHint tokenId="BSCUSDT" />);
    expect(screen.getByTestId('exchange-usdt-payment-token-hint')).toBeInTheDocument();
    expect(screen.getByText('payment.cryptoReadiness.tokenHint.bsc')).toBeInTheDocument();
  });

  it('renders nothing for unsupported token', () => {
    const { container } = render(<ExchangeUsdtPaymentTokenHint tokenId="BTC" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ExchangeUsdtPaymentTokenHint locale gate', () => {
  it('is hidden for unsupported locales', async () => {
    vi.resetModules();
    vi.doMock('@mobazha/core', async () => {
      const guide = await import('../../../../../packages/core/config/exchangeUsdtPaymentGuide');
      return {
        ...guide,
        useI18n: () => ({
          locale: 'ja',
          t: (key: string) => key,
        }),
      };
    });

    const { ExchangeUsdtPaymentTokenHint: HintJa } =
      await import('@/components/Payment/ExchangeUsdtPaymentTokenHint');
    const { container } = render(<HintJa tokenId="BSCUSDT" />);
    expect(container).toBeEmptyDOMElement();
  });
});
