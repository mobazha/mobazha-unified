import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { GuestOrderAdminDetail } from '@mobazha/core/services/api/guestCheckout';

const { mockUseGuestOrderKind } = vi.hoisted(() => ({
  mockUseGuestOrderKind: vi.fn(),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'admin.orders.guestOrderDetail': 'Guest Order Detail',
          'admin.orders.guestActionsTitle': 'Seller actions',
          'admin.orders.guestDigitalDeliverHelp': 'Mark digital delivery when ready.',
          'admin.orders.guestMarkDelivered': 'Mark as delivered',
          'admin.orders.guestOrderTypeDigital': 'Digital',
          'admin.orders.guestOrderTypeUnknown': 'Type unknown',
          'admin.orders.guestContractTypeMissingHelp':
            'Fulfillment actions stay disabled until order data is repaired.',
          'admin.orders.timeLabel': 'Time',
          'admin.orders.contactLabel': 'Contact',
          'admin.orders.technicalInfo': 'Technical Info',
          'admin.orders.paymentRailLabel': 'Payment rail ID',
          'admin.orders.listingCurrencyLabel': 'Listing currency',
          'admin.orders.tokenLabel': 'Order Token',
          'common.none': 'None',
          'common.loadFailed': 'Failed to load',
          'admin.orders.guestDetailLoadFailed': 'Unable to load this guest order.',
          'common.retry': 'Retry',
          'common.copy': 'Copy',
          'guestOrder.stateFunded': 'Payment Confirmed',
        };
        return translations[key] ?? key;
      },
    }),
    getImageUrl: (hash: string) => `https://img.test/${hash}`,
    useGuestOrderKind: mockUseGuestOrderKind,
  };
});

vi.mock('@mobazha/core/data/tokens', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core/data/tokens')>();
  return {
    ...actual,
    resolveTokenIdForDisplay: (coin: string) => coin,
  };
});

vi.mock('@/components/GuestCheckout/AdminShippingDecrypt', () => ({
  AdminShippingDecrypt: () => <div data-testid="shipping-decrypt" />,
}));

vi.mock('@/components/Payment/TokenIcon', () => ({
  TokenIcon: () => <span data-testid="token-icon" />,
}));

vi.mock('@/components/admin/orders/utils', () => ({
  formatGuestPaymentAmount: () => '0.01 BTC',
}));

vi.mock('@/components/orders/GuestFulfillmentSection', () => ({
  GuestFulfillmentSection: () => <div data-testid="guest-fulfillment-section" />,
}));

vi.mock('@/components/orders/GuestOrderStageStrip', () => ({
  GuestOrderStageStrip: () => <div data-testid="guest-order-stage-strip" />,
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { GuestOrderDetailDrawer } from '@/components/orders/GuestOrderDetailDrawer';

const digitalFundedDetail: GuestOrderAdminDetail = {
  orderToken: 'guest-token-abc',
  state: 'FUNDED',
  paymentCoin: 'BTC',
  paymentAmount: '1000000',
  priceCurrency: 'USD',
  items: [
    {
      listingHash: 'QmListing',
      listingTitle: 'Digital Course',
      listingSlug: 'digital-course',
      sellerPeerID: 'QmSeller',
      thumbnail: 'QmThumb',
      quantity: 1,
      unitPrice: '2500',
    },
  ],
  createdAt: '2026-05-18T12:00:00Z',
  updatedAt: '2026-05-18T12:00:00Z',
  addressEncrypted: false,
};

const digitalGuestOrderKind = {
  orderKind: 'digital' as const,
  isPhysical: false,
  isUnknown: false,
  digitalDelivery: {
    loading: false,
    error: null,
    isDigitalOrder: true,
    deliveryKnown: true,
    assetCount: 1,
    hasPreconfiguredAssets: true,
    deliveryStatus: 'ready',
    listingSlugs: ['digital-course'],
    listingSlug: 'digital-course',
    refresh: vi.fn(),
    sellerDigitalProps: {
      isDigitalOrder: true,
      isLoading: false,
      isSyncing: false,
      assetCount: 1,
      hasPreconfiguredAssets: true,
      status: 'ready',
      error: null,
      canSyncDelivery: false,
      canRetryDelivery: false,
      onSyncDelivery: async () => false,
      onRetryDelivery: async () => false,
      listingSlug: 'digital-course',
      listingSlugs: ['digital-course'],
      orderId: 'guest-token-abc',
      onManageListing: vi.fn(),
      refreshStatus: vi.fn(),
    },
  },
};

describe('GuestOrderDetailDrawer', () => {
  const baseProps = {
    open: true,
    loading: false,
    loadError: false,
    shipCarrier: '',
    shipTracking: '',
    actionLoading: null,
    onClose: vi.fn(),
    onRetry: vi.fn(),
    onShipCarrierChange: vi.fn(),
    onShipTrackingChange: vi.fn(),
    onShip: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    mockUseGuestOrderKind.mockReturnValue(digitalGuestOrderKind);
  });

  it('shows retry UI when detail load fails', () => {
    const onRetry = vi.fn();
    render(<GuestOrderDetailDrawer {...baseProps} detail={null} loadError onRetry={onRetry} />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByText('Unable to load this guest order.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows digital deliver action for funded digital orders', () => {
    render(<GuestOrderDetailDrawer {...baseProps} detail={digitalFundedDetail} />);

    expect(screen.getByText('Digital Course')).toBeInTheDocument();
    expect(screen.getByText('Digital')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Mark as delivered' }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('shipping-decrypt')).not.toBeInTheDocument();
  });

  it('hides fulfillment actions when order kind is unknown', () => {
    mockUseGuestOrderKind.mockReturnValue({
      orderKind: 'unknown',
      isPhysical: false,
      isUnknown: true,
      digitalDelivery: {
        ...digitalGuestOrderKind.digitalDelivery,
        isDigitalOrder: false,
        deliveryStatus: 'pending',
        sellerDigitalProps: {
          ...digitalGuestOrderKind.digitalDelivery.sellerDigitalProps,
          isDigitalOrder: false,
          status: 'pending',
        },
      },
    });

    render(<GuestOrderDetailDrawer {...baseProps} detail={digitalFundedDetail} />);

    expect(
      screen.getByText('Fulfillment actions stay disabled until order data is repaired.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as delivered' })).not.toBeInTheDocument();
  });
});
