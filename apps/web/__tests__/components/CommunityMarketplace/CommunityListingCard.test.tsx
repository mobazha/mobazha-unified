import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CommunityListingCard } from '@/components/CommunityMarketplace/CommunityListingCard';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    className,
    onLoad,
  }: {
    alt: string;
    className?: string;
    onLoad?: () => void;
  }) => <img alt={alt} className={className} onLoad={onLoad} data-testid="listing-image" />,
}));

vi.mock('@mobazha/core', () => ({
  communityProductHref: (slug: string) => `/product/${slug}`,
  identityNameProps: (className: string) => ({ className }),
  resolveProductCardSellerDisplay: () => ({ name: 'Demo Store', avatarUrl: undefined }),
  useCurrency: () => ({
    renderPairedPrice: () => '$12.00',
  }),
}));

vi.mock('@mobazha/core/curation/collectibleMarketplace', () => ({
  resolveCollectibleListingImageUrl: (_slug: string, imageUrl?: string) => imageUrl,
}));

describe('CommunityListingCard image fit', () => {
  it('renders product media with contain fit on a muted canvas', () => {
    render(
      <CommunityListingCard
        preview={{
          key: 'peer-1:demo-card',
          slug: 'demo-card',
          peerID: 'peer-1',
          title: 'Demo collectible',
          imageUrl: 'https://cdn.example.com/card.png',
          price: 1200,
          currency: 'USD',
          divisibility: 2,
          loading: false,
          failed: false,
        }}
      />
    );

    const image = screen.getByTestId('listing-image');
    expect(image).toHaveClass('object-contain');
    expect(image).not.toHaveClass('object-cover');
    expect(image.closest('.bg-muted')).toBeTruthy();
  });
});
