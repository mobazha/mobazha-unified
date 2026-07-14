// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const mockGetMarketplaceLink = vi.fn();
const mockCopyToClipboard = vi.fn();
const mockToast = vi.fn();

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));
vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) };
});
vi.mock('@mobazha/core/services/api/marketplace', () => ({
  getMarketplaceLink: (...args: unknown[]) => mockGetMarketplaceLink(...args),
}));

import { OperatorSharePanel } from '@/components/Operator/OperatorSharePanel';

describe('OperatorSharePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // API returns a RELATIVE path (FrontendURL unset) — must be resolved to absolute.
    mockGetMarketplaceLink.mockResolvedValue({ url: '/marketplace/curated-market', qrText: '' });
    mockCopyToClipboard.mockResolvedValue(true);
  });

  it('copies a community link with operator-share UTM, resolving a relative path to absolute', async () => {
    render(<OperatorSharePanel marketplaceId="mp-1" slug="curated-market" />);

    const communityBtn = await screen.findByTestId('operator-share-copy-community');
    fireEvent.click(communityBtn);

    await waitFor(() => expect(mockCopyToClipboard).toHaveBeenCalledTimes(1));
    const copied = mockCopyToClipboard.mock.calls[0][0] as string;
    expect(copied).toMatch(/^https?:\/\//); // absolute, not the relative path
    expect(copied).toContain('/marketplace/curated-market');
    expect(copied).toContain('utm_source=operator_share');
    expect(copied).toContain('utm_medium=community');
    expect(copied).toContain('utm_campaign=curated-market');
  });

  it('copies a plain link without UTM params', async () => {
    render(<OperatorSharePanel marketplaceId="mp-1" slug="curated-market" />);

    fireEvent.click(await screen.findByTestId('operator-share-copy-link'));

    await waitFor(() => expect(mockCopyToClipboard).toHaveBeenCalledTimes(1));
    const copied = mockCopyToClipboard.mock.calls[0][0] as string;
    expect(copied).toContain('/marketplace/curated-market');
    expect(copied).not.toContain('utm_source');
  });

  it('reveals a manual-copy input when the clipboard is blocked', async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    render(<OperatorSharePanel marketplaceId="mp-1" slug="curated-market" />);

    fireEvent.click(await screen.findByTestId('operator-share-copy-community'));

    const manual = await screen.findByTestId('operator-share-manual-input');
    expect(manual).toBeInTheDocument();
    expect((manual as HTMLInputElement).value).toContain('utm_source=operator_share');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('shows an error state when the share link cannot be loaded', async () => {
    mockGetMarketplaceLink.mockRejectedValue(new Error('link down'));
    render(<OperatorSharePanel marketplaceId="mp-1" slug="curated-market" />);

    expect(await screen.findByTestId('operator-share-error')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-share-copy-community')).toBeNull();
  });
});
