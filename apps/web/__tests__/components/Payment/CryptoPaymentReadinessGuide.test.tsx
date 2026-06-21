import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MAINLAND_GUIDE_DISMISS_STORAGE_KEY } from '../../../../../packages/core/config/mainlandCryptoPaymentGuide';

const dismissMock = vi.fn();
let dismissed = false;

vi.mock('@mobazha/core', async () => {
  const mainland = await import('../../../../../packages/core/config/mainlandCryptoPaymentGuide');
  return {
    ...mainland,
    useI18n: () => ({
      locale: 'zh',
      t: (key: string) => key,
    }),
    useMainlandCryptoGuideDismiss: () => ({
      dismissed,
      dismiss: dismissMock,
    }),
  };
});
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('CryptoPaymentReadinessGuide', () => {
  beforeEach(() => {
    dismissed = false;
    dismissMock.mockClear();
    localStorage.clear();
  });

  it('renders slim guide for zh locale', async () => {
    const { CryptoPaymentReadinessGuide } =
      await import('@/components/Payment/CryptoPaymentReadinessGuide');
    render(<CryptoPaymentReadinessGuide />);
    expect(screen.getByTestId('crypto-payment-readiness-guide')).toBeInTheDocument();
    expect(screen.getByText('payment.cryptoReadiness.title')).toBeInTheDocument();
    fireEvent.click(screen.getByText('payment.cryptoReadiness.title'));
    expect(screen.getByText('payment.cryptoReadiness.summary')).toBeInTheDocument();
    expect(screen.getByText('payment.cryptoReadiness.fullGuideLink')).toHaveAttribute(
      'href',
      '/help/mainland-payment'
    );
    expect(screen.getByText('payment.cryptoReadiness.fullGuideLink')).toHaveAttribute(
      'target',
      '_blank'
    );
  });

  it('calls dismiss when user opts out', async () => {
    const { CryptoPaymentReadinessGuide } =
      await import('@/components/Payment/CryptoPaymentReadinessGuide');
    render(<CryptoPaymentReadinessGuide />);
    fireEvent.click(screen.getByText('payment.cryptoReadiness.title'));
    fireEvent.click(screen.getByText('payment.cryptoReadiness.dismiss'));
    expect(dismissMock).toHaveBeenCalledTimes(1);
  });

  it('is hidden when dismissed', async () => {
    dismissed = true;
    const { CryptoPaymentReadinessGuide } =
      await import('@/components/Payment/CryptoPaymentReadinessGuide');
    const { container } = render(<CryptoPaymentReadinessGuide />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CryptoPaymentReadinessGuide locale gate', () => {
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
        useMainlandCryptoGuideDismiss: () => ({
          dismissed: false,
          dismiss: vi.fn(),
        }),
      };
    });

    const { CryptoPaymentReadinessGuide: GuideJa } =
      await import('@/components/Payment/CryptoPaymentReadinessGuide');
    const { container } = render(<GuideJa />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('useMainlandCryptoGuideDismiss storage key', () => {
  it('uses stable localStorage key', () => {
    expect(MAINLAND_GUIDE_DISMISS_STORAGE_KEY).toBe('mobazha.mainlandCryptoGuide.dismissed');
  });
});
