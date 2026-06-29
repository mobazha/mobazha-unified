import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProductBottomBar } from '@/components/Product/ProductBottomBar';
import type { Product } from '@mobazha/core';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en' as const,
    }),
    useFeature: () => true,
    useCartStore: (selector: (state: { getItemCount: () => number }) => unknown) =>
      selector({ getItemCount: () => 0 }),
    useChatStore: (selector: (state: { openDrawerWithPeer: () => void }) => unknown) =>
      selector({ openDrawerWithPeer: vi.fn() }),
    selectUnreadCountByPeerID: () => () => 0,
  };
});

vi.mock('@/lib/platform', () => ({
  useHaptic: () => ({ impact: vi.fn() }),
}));

const authoritativeProduct = {
  slug: 'psa-charizard',
  vendorID: { peerID: 'QmSeller' },
  metadata: { contractType: 'RWA_TOKEN', pricingCurrency: { code: 'USD', divisibility: 2 } },
  item: {
    title: 'PSA Charizard',
    price: 100,
    blockchain: 'solana',
    tags: [
      'collectibles.fulfillment=nft',
      'collectibles.cert_number=PSA-123',
      'collectibles.hub_slot_id=slot-1',
      'collectibles.hub_location=source-custody',
    ],
  },
} as unknown as Product;

const physicalProduct = {
  slug: 'plain-shirt',
  vendorID: { peerID: 'QmSeller' },
  metadata: { contractType: 'PHYSICAL_GOOD', pricingCurrency: { code: 'USD', divisibility: 2 } },
  item: { title: 'Plain Shirt', price: 20 },
} as unknown as Product;

describe('ProductCollectiblePurchaseActions', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('shows a single purchase-title CTA for authoritative collectible listings', async () => {
    render(
      <ProductBottomBar
        product={authoritativeProduct}
        quantity={3}
        stock={5}
        paymentAvailable
      />
    );

    expect(screen.getByTestId('product-detail-purchase-title')).toBeInTheDocument();
    expect(screen.queryByTestId('product-detail-add-to-cart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('product-detail-buy-now')).not.toBeInTheDocument();

    await fireEvent.click(screen.getByTestId('product-detail-purchase-title'));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/checkout?slug=psa-charizard&peerID=QmSeller&quantity=1')
    );
  });

  it('keeps add-to-cart and buy-now for ordinary physical goods', () => {
    render(
      <ProductBottomBar product={physicalProduct} quantity={2} stock={5} paymentAvailable />
    );

    expect(screen.getByTestId('product-detail-add-to-cart')).toBeInTheDocument();
    expect(screen.getByTestId('product-detail-buy-now')).toBeInTheDocument();
    expect(screen.queryByTestId('product-detail-purchase-title')).not.toBeInTheDocument();
  });
});
