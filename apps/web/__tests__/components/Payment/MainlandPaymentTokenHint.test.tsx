import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MainlandPaymentTokenHint } from '@/components/Payment/MainlandPaymentTokenHint';

vi.mock('@mobazha/core', async () => {
  const mainland = await import('../../../../../packages/core/config/mainlandCryptoPaymentGuide');
  return {
    ...mainland,
    useI18n: () => ({
      locale: 'zh',
      t: (key: string) => key,
    }),
  };
});

describe('MainlandPaymentTokenHint', () => {
  it('shows BSC hint for BSCUSDT', () => {
    render(<MainlandPaymentTokenHint tokenId="BSCUSDT" />);
    expect(screen.getByTestId('mainland-payment-token-hint')).toBeInTheDocument();
    expect(screen.getByText('payment.cryptoReadiness.tokenHint.bsc')).toBeInTheDocument();
  });

  it('is hidden without a mappable token', () => {
    const { container } = render(<MainlandPaymentTokenHint tokenId="BTC" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('MainlandPaymentTokenHint locale gate', () => {
  it('is hidden for unsupported locales', async () => {
    vi.resetModules();
    vi.doMock('@mobazha/core', async () => {
      const mainland =
        await import('../../../../../packages/core/config/mainlandCryptoPaymentGuide');
      return {
        ...mainland,
        useI18n: () => ({
          locale: 'ja',
          t: (key: string) => key,
        }),
      };
    });

    const { MainlandPaymentTokenHint: HintJa } =
      await import('@/components/Payment/MainlandPaymentTokenHint');
    const { container } = render(<HintJa tokenId="BSCUSDT" />);
    expect(container).toBeEmptyDOMElement();
  });
});
