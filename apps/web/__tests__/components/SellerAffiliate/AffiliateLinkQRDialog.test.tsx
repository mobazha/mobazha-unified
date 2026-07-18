// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

// jsdom has no canvas implementation; stub the PNG export the download uses.
const toDataURLMock = vi.fn(() => 'data:image/png;base64,STUB');

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }: { value: string }) => (
    <canvas data-testid="mock-qr-canvas" data-value={value} />
  ),
}));

import { AffiliateLinkQRDialog } from '@/components/SellerAffiliate/AffiliateLinkQRDialog';

describe('AffiliateLinkQRDialog', () => {
  beforeEach(() => {
    toDataURLMock.mockClear();
    window.HTMLCanvasElement.prototype.toDataURL = toDataURLMock as never;
  });

  it('renders the QR for the share URL with the store name as title', async () => {
    render(
      <AffiliateLinkQRDialog
        url="https://example.test/a/Ab3xKz9m"
        fileStem="promo-Ab3xKz9m"
        storeName="Great Store"
      />
    );

    fireEvent.click(screen.getByTestId('promote-qr-link'));

    await waitFor(() => expect(screen.getByTestId('promote-qr-dialog')).toBeInTheDocument());
    expect(screen.getByTestId('mock-qr-canvas')).toHaveAttribute(
      'data-value',
      'https://example.test/a/Ab3xKz9m'
    );
    expect(screen.getByText('Great Store')).toBeInTheDocument();
    expect(screen.getByText('https://example.test/a/Ab3xKz9m')).toBeInTheDocument();
  });

  it('falls back to the generic title without a store name', async () => {
    render(<AffiliateLinkQRDialog url="https://example.test/a/Ab3xKz9m" fileStem="promo-x" />);

    fireEvent.click(screen.getByTestId('promote-qr-link'));

    await waitFor(() => expect(screen.getByText('promote.qrTitle')).toBeInTheDocument());
  });

  it('downloads the PNG named after the short code', async () => {
    const clickSpy = vi
      .spyOn(window.HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    render(
      <AffiliateLinkQRDialog
        url="https://example.test/a/Ab3xKz9m"
        fileStem="promo-Ab3xKz9m"
        storeName="Great Store"
      />
    );

    fireEvent.click(screen.getByTestId('promote-qr-link'));
    await waitFor(() => expect(screen.getByTestId('promote-qr-download')).toBeInTheDocument());

    let capturedDownload = '';
    clickSpy.mockImplementation(function (this: HTMLAnchorElement) {
      capturedDownload = this.download;
    });
    fireEvent.click(screen.getByTestId('promote-qr-download'));

    expect(toDataURLMock).toHaveBeenCalledWith('image/png');
    expect(capturedDownload).toBe('promo-Ab3xKz9m.png');
    clickSpy.mockRestore();
  });
});
