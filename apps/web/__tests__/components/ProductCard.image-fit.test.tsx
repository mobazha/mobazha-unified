// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProductCard } from '@/components/ProductCard/ProductCard';

vi.mock('next/image', () => ({
  default: ({
    alt,
    className,
    onLoad,
  }: {
    alt: string;
    className?: string;
    onLoad?: () => void;
  }) => <img alt={alt} className={className} onLoad={onLoad} data-testid="product-card-image" />,
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useCurrencyFormat: () => ({
      formatLocalPrice: (price: number | string) => `$${price}`,
    }),
    useI18n: () => ({
      t: (key: string) => key,
    }),
    identityNameProps: (className: string) => ({ className }),
  };
});

describe('ProductCard image fit', () => {
  it('shows full product media with contain fit and no hover scale crop', () => {
    render(
      <ProductCard
        title="Sample item"
        imageUrl="https://cdn.example.com/product.jpg"
        price={1999}
        currency="USD"
      />
    );

    const image = screen.getByTestId('product-card-image');
    expect(image).toHaveClass('object-contain');
    expect(image).not.toHaveClass('object-cover');
    expect(image).not.toHaveClass('group-hover:scale-105');
    expect(image.closest('.bg-muted')).toBeTruthy();
  });
});
