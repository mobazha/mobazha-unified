import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const copyToClipboardMock = vi.fn<(text: string) => Promise<boolean>>(async () => true);

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: (text: string) => copyToClipboardMock(text),
}));

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

import { RefundDestinationAddressDisplay } from '@/components/shared/RefundDestinationAddressDisplay';

const FULL_ADDRESS = 'bitcoincash:qptestaddress1234567890abcdefghijklmnopqrstuvwx';

describe('RefundDestinationAddressDisplay', () => {
  beforeEach(() => {
    copyToClipboardMock.mockClear();
  });

  it('renders full address without truncation', () => {
    render(
      <RefundDestinationAddressDisplay address={FULL_ADDRESS} addressTestId="refund-address-full" />
    );
    expect(screen.getByTestId('refund-address-full')).toHaveTextContent(FULL_ADDRESS);
  });

  it('returns null for blank address', () => {
    const { container } = render(<RefundDestinationAddressDisplay address="   " />);
    expect(container).toBeEmptyDOMElement();
  });

  it('copies full address when copy button is clicked', async () => {
    render(<RefundDestinationAddressDisplay address={FULL_ADDRESS} copyTestId="refund-copy-btn" />);

    fireEvent.click(screen.getByTestId('refund-copy-btn'));

    expect(copyToClipboardMock).toHaveBeenCalledWith(FULL_ADDRESS);
    expect(await screen.findByText('common.copied')).toBeInTheDocument();
  });

  it('hides header but keeps copy control when showHeader is false', () => {
    render(
      <RefundDestinationAddressDisplay
        address={FULL_ADDRESS}
        showHeader={false}
        copyTestId="refund-copy-compact"
        addressTestId="refund-address-compact"
      />
    );

    expect(screen.queryByText('payment.refundDestination.title')).not.toBeInTheDocument();
    expect(screen.getByTestId('refund-copy-compact')).toBeInTheDocument();
    expect(screen.getByTestId('refund-address-compact')).toHaveTextContent(FULL_ADDRESS);
  });
});
