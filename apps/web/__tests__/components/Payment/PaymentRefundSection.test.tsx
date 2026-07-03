import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/Checkout/RefundAddressField', () => ({
  RefundAddressField: () => <div data-testid="refund-address-field" />,
}));

vi.mock('@/components/shared/RefundDestinationAddressDisplay', () => ({
  RefundDestinationAddressDisplay: ({
    address,
    showHeader,
    addressTestId,
    copyTestId,
  }: {
    address: string;
    showHeader?: boolean;
    addressTestId?: string;
    copyTestId?: string;
  }) => (
    <div data-testid="refund-destination-display" data-show-header={String(showHeader ?? true)}>
      <span data-testid={addressTestId}>{address}</span>
      <button type="button" data-testid={copyTestId}>
        copy
      </button>
    </div>
  ),
}));

import { PaymentRefundSection } from '@/components/Payment/PaymentRefundSection';

const FULL_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

describe('PaymentRefundSection', () => {
  it('shows resolved destination with full address when not paying from exchange', () => {
    render(
      <PaymentRefundSection
        resolvedAddress={FULL_ADDRESS}
        refundAddress=""
        onRefundAddressChange={() => {}}
        payFromCustodial={false}
        onPayFromCustodialChange={() => {}}
      />
    );

    expect(screen.getByTestId('payment-refund-destination')).toBeInTheDocument();
    expect(screen.getByTestId('payment-refund-destination-address')).toHaveTextContent(
      FULL_ADDRESS
    );
    expect(screen.getByTestId('payment-refund-destination-copy')).toBeInTheDocument();
  });

  it('shows confirm notice with separate full address block for prefilled custodial refund', () => {
    render(
      <PaymentRefundSection
        resolvedAddress=""
        refundAddress={FULL_ADDRESS}
        onRefundAddressChange={() => {}}
        payFromCustodial
        onPayFromCustodialChange={() => {}}
        refundAddressPrefilled
      />
    );

    expect(screen.getByTestId('payment-custodial-refund-confirm')).toBeInTheDocument();
    expect(screen.getByText('payment.custodialPayment.confirmNotice')).toBeInTheDocument();
    expect(screen.getByTestId('payment-custodial-refund-confirm-address')).toHaveTextContent(
      FULL_ADDRESS
    );
    expect(screen.getByTestId('payment-custodial-refund-confirm-copy')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-custodial-refund-address')).not.toBeInTheDocument();
  });

  it('allows switching from confirm notice to edit refund address', () => {
    render(
      <PaymentRefundSection
        resolvedAddress=""
        refundAddress={FULL_ADDRESS}
        onRefundAddressChange={() => {}}
        payFromCustodial
        onPayFromCustodialChange={() => {}}
        refundAddressPrefilled
      />
    );

    fireEvent.click(screen.getByTestId('payment-custodial-refund-change'));

    expect(screen.queryByTestId('payment-custodial-refund-confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('refund-address-field')).toBeInTheDocument();
  });
});
