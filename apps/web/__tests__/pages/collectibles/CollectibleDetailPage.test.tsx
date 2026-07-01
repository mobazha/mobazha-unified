// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ApiError } from '@mobazha/core/services/api/client';

const mockUseCollectibleNFT = vi.fn();
const mockUseCollectibleRedemptionByMint = vi.fn();
const mockUseUserStore = vi.fn();
const mockUseAppKit = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ mint: 'mockpnft63e66626bd4e442e77e0e953d61226dc5512' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components', () => ({
  Header: () => <header data-testid="header" />,
  Footer: () => <footer data-testid="footer" />,
}));

vi.mock('@/components/MobilePageHeader/MobilePageHeader', () => ({
  MobilePageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/layouts', () => ({
  Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <span {...props}>{children}</span>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/collectibles/CollectibleOnChainProof', () => ({
  CollectibleOnChainProof: () => <div data-testid="on-chain-proof" />,
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useCollectibleNFT: (...args: unknown[]) => mockUseCollectibleNFT(...args),
    useCollectibleRedemptionByMint: (...args: unknown[]) =>
      mockUseCollectibleRedemptionByMint(...args),
    useUserStore: () => mockUseUserStore(),
    useAppKit: () => mockUseAppKit(),
    useI18n: () => ({ t: (key: string) => key }),
    getEnvConfig: () => ({ isTestEnv: true }),
  };
});

import CollectibleDetailPage from '@/app/collectibles/[mint]/page';

const mockNft = {
  nftMint: 'mockpnft63e66626bd4e442e77e0e953d61226dc5512',
  hubSlotID: 'source_9591a58c-4f55-4e57-a151-9b4a0558a238',
  chain: 'solana',
  hubSlot: {
    hubSlotID: 'source_9591a58c-4f55-4e57-a151-9b4a0558a238',
    certNumber: 'M2-WILSON-001',
    serial: 'WILSON-001',
    hubLocation: 'source-custody',
    status: 'in_circulation',
    grade: 'PSA 10',
  },
};

describe('CollectibleDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserStore.mockReturnValue({ isAuthenticated: false });
    mockUseAppKit.mockReturnValue({
      address: '',
      isConnected: false,
      isInitializing: false,
      connectSolana: vi.fn(),
      getWalletProvider: vi.fn(),
      chain: undefined,
    });
    mockUseCollectibleRedemptionByMint.mockReturnValue({
      redemption: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('loads public NFT detail without feature flags', async () => {
    const refresh = vi.fn();
    mockUseCollectibleNFT.mockReturnValue({
      nft: mockNft,
      loading: false,
      error: null,
      refresh,
    });

    render(<CollectibleDetailPage />);

    expect(mockUseCollectibleNFT).toHaveBeenCalledWith(
      'mockpnft63e66626bd4e442e77e0e953d61226dc5512',
      true
    );
    await waitFor(() => {
      expect(screen.getByTestId('collectibles-detail-content')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('collectibles-feature-disabled')).not.toBeInTheDocument();
  });

  it('shows feature-disabled state only for public catalog guard errors', async () => {
    mockUseCollectibleNFT.mockReturnValue({
      nft: null,
      loading: false,
      error: new ApiError('Feature disabled', 403, 'feature_disabled'),
      refresh: vi.fn(),
    });

    render(<CollectibleDetailPage />);

    expect(screen.getByTestId('collectibles-feature-disabled')).toBeInTheDocument();
    expect(screen.queryByTestId('collectibles-detail-content')).not.toBeInTheDocument();
  });

  it('shows retryable error for non-guard failures', async () => {
    const refresh = vi.fn();
    mockUseCollectibleNFT.mockReturnValue({
      nft: null,
      loading: false,
      error: new ApiError('Server error', 500),
      refresh,
    });

    render(<CollectibleDetailPage />);

    expect(screen.queryByTestId('collectibles-feature-disabled')).not.toBeInTheDocument();
    expect(screen.getByText('Server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeInTheDocument();
  });

  it('does not query private redemption progress for anonymous burned NFT views', () => {
    mockUseCollectibleNFT.mockReturnValue({
      nft: { ...mockNft, burnAt: '2026-01-01T00:00:00Z' },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<CollectibleDetailPage />);

    expect(mockUseCollectibleRedemptionByMint).toHaveBeenCalledWith(mockNft.nftMint, false);
  });

  it('queries private redemption progress when authenticated and NFT is burned', () => {
    mockUseUserStore.mockReturnValue({ isAuthenticated: true });
    mockUseCollectibleNFT.mockReturnValue({
      nft: { ...mockNft, burnAt: '2026-01-01T00:00:00Z' },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<CollectibleDetailPage />);

    expect(mockUseCollectibleRedemptionByMint).toHaveBeenCalledWith(mockNft.nftMint, true);
  });

  it('shows voided credential status and hides redemption actions', async () => {
    mockUseCollectibleNFT.mockReturnValue({
      nft: {
        ...mockNft,
        validityStatus: 'voided',
        invalidationReason: 'Refunded after seller default',
        invalidatedAt: '2026-06-01T00:00:00Z',
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<CollectibleDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('collectible-validity-badge')).toHaveTextContent(
        'collectibles.validity.voided'
      );
    });
    expect(screen.getByTestId('collectible-voided-notice')).toBeInTheDocument();
    expect(screen.queryByText('collectibles.redeem.title')).not.toBeInTheDocument();
    expect(screen.queryByText('collectibles.redeem.submit')).not.toBeInTheDocument();
  });
});
