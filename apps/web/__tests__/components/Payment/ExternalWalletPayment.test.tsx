import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExternalWalletPayment } from '@/components/Payment/ExternalWalletPayment';

Element.prototype.scrollIntoView = vi.fn();

vi.mock('@mobazha/core', async () => {
  const actual = await vi.importActual<typeof import('@mobazha/core')>('@mobazha/core');
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  };
});

describe('ExternalWalletPayment', () => {
  it('renders canonical Monero asset IDs as XMR', () => {
    render(
      <ExternalWalletPayment
        tokenId="crypto:monero:mainnet:native"
        paymentInfo={{
          paymentAddress: '5DemoAddress',
          amount: '50000000000',
          coin: 'crypto:monero:mainnet:native',
          orderID: 'demo-order',
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'payment.sendPayment XMR' })).toBeInTheDocument();
    expect(screen.getByText('0.05')).toBeInTheDocument();
    expect(screen.getByText('XMR')).toBeInTheDocument();
    expect(screen.queryByText(/CRYPTO:MONERO:MAINNET:NATIVE/i)).not.toBeInTheDocument();
  });
});
