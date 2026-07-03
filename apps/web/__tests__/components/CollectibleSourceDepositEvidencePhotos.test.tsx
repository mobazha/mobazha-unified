// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CollectibleSourceDepositEvidencePhotos } from '@/components/collectibles/CollectibleSourceDepositEvidencePhotos';

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

describe('CollectibleSourceDepositEvidencePhotos', () => {
  it('renders nothing when photosJSON is empty or invalid', () => {
    const { container } = render(<CollectibleSourceDepositEvidencePhotos photosJSON="" />);
    expect(container).toBeEmptyDOMElement();
    expect(
      render(<CollectibleSourceDepositEvidencePhotos photosJSON="not-json" />).container
    ).toBeEmptyDOMElement();
  });

  it('renders front/back thumbnails with external links during review', () => {
    render(
      <CollectibleSourceDepositEvidencePhotos
        photosJSON={JSON.stringify([
          'https://example.com/front.jpg',
          'https://example.com/back.jpg',
        ])}
      />
    );

    expect(screen.getByTestId('source-deposit-evidence-photos')).toBeInTheDocument();
    expect(screen.getByText('collectibles.sourceOps.evidenceFront')).toBeInTheDocument();
    expect(screen.getByText('collectibles.sourceOps.evidenceBack')).toBeInTheDocument();

    const frontLink = screen.getByRole('link', {
      name: 'collectibles.sourceOps.evidenceFront: collectibles.sourceOps.evidenceOpenLink',
    });
    expect(frontLink).toHaveAttribute('href', 'https://example.com/front.jpg');
    expect(frontLink).toHaveAttribute('target', '_blank');
    expect(frontLink).toHaveAttribute('rel', 'noopener noreferrer');

    const frontImage = screen.getByRole('img', {
      name: 'collectibles.sourceOps.evidenceFrontAlt',
    });
    expect(frontImage).toHaveAttribute('src', 'https://example.com/front.jpg');
  });
});
