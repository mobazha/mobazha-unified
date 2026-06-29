import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CollectibleTitleListingPanel } from '@/components/Product/CollectibleTitleListingPanel';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en' as const,
    }),
  };
});

describe('CollectibleTitleListingPanel', () => {
  it('renders custody and lifecycle copy for source-custody listings', () => {
    render(
      <CollectibleTitleListingPanel
        meta={{
          fulfillment: 'nft',
          certNumber: 'PSA-123',
          grade: 'PSA 10',
          hubLocation: 'source-custody',
        }}
        titleNetworkLabel="Solana"
      />
    );

    expect(screen.getByTestId('collectible-title-listing-panel')).toBeInTheDocument();
    expect(screen.getByText('product.collectibleTitle.whatYouReceiveTitle')).toBeInTheDocument();
    expect(screen.getByText('product.collectibleTitle.custody.source')).toBeInTheDocument();
    expect(screen.getByText('product.collectibleTitle.titleNetwork')).toBeInTheDocument();
    expect(screen.getByText('Solana')).toBeInTheDocument();
    expect(screen.getByText('PSA-123')).toBeInTheDocument();
    expect(screen.getByText('PSA 10')).toBeInTheDocument();
  });
});
