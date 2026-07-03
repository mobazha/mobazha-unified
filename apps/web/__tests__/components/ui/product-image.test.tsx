// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProductImage } from '@/components/ui/product-image';

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    className,
    onLoad,
    onError,
  }: {
    alt: string;
    src: string;
    className?: string;
    onLoad?: () => void;
    onError?: () => void;
  }) => (
    <img
      alt={alt}
      src={src}
      className={className}
      onLoad={onLoad}
      onError={onError}
      data-testid="next-image"
    />
  ),
}));

describe('ProductImage fit contract', () => {
  it('defaults to object-contain for fill layout', () => {
    render(
      <div className="relative h-40 w-40">
        <ProductImage src="https://cdn.example.com/item.jpg" alt="Demo product" fill />
      </div>
    );

    const image = screen.getByTestId('next-image');
    expect(image).toHaveClass('object-contain');
    expect(image).not.toHaveClass('object-cover');
  });

  it('supports explicit cover opt-in', () => {
    render(
      <div className="relative h-40 w-40">
        <ProductImage
          src="https://cdn.example.com/item.jpg"
          alt="Cropped thumbnail"
          fill
          fit="cover"
        />
      </div>
    );

    const image = screen.getByTestId('next-image');
    expect(image).toHaveClass('object-cover');
  });

  it('uses object-contain for non-fill img layout by default', () => {
    render(<ProductImage src="https://cdn.example.com/item.jpg" alt="Listing" />);

    const image = screen.getByRole('img', { name: 'Listing' });
    expect(image).toHaveClass('object-contain');
  });
});
