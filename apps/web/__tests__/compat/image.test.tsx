import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Image from '@/compat/image';

describe('compat Image fill layout', () => {
  it('does not inject inline object-fit cover when fill is true', () => {
    render(
      <div className="relative h-40 w-40">
        <Image
          src="https://cdn.example.com/item.jpg"
          alt="Product"
          fill
          className="object-contain"
        />
      </div>
    );

    const image = screen.getByRole('img', { name: 'Product' });
    expect(image).toHaveClass('object-contain');
    expect(image.style.objectFit).not.toBe('cover');
    expect(image.style.position).toBe('absolute');
    expect(image.style.width).toBe('100%');
    expect(image.style.height).toBe('100%');
  });

  it('preserves an explicit style objectFit when fill is true', () => {
    render(
      <div className="relative h-40 w-40">
        <Image
          src="https://cdn.example.com/item.jpg"
          alt="Cropped thumbnail"
          fill
          style={{ objectFit: 'cover' }}
        />
      </div>
    );

    const image = screen.getByRole('img', { name: 'Cropped thumbnail' });
    expect(image.style.objectFit).toBe('cover');
  });
});
