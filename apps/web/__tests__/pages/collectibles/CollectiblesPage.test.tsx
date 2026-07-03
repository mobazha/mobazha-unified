// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import CollectiblesPage from '@/app/collectibles/page';

const mockRefresh = vi.fn();
const mockConnect = vi.fn();

let appKitState = {
  isConnected: false,
  isInitializing: false,
  address: null as string | null,
  chain: null as { chainNamespace?: string } | null,
};

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
  Button: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button type="button" onClick={onClick} {...props}>
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
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useCollectibleNFTs: () => ({
      items: [
        {
          nftMint: 'mint-1',
          hubSlotID: 'slot-1',
          hubSlot: { currentHolder: 'BuyerSol1111111111111111111111111111111' },
        },
      ],
      loading: false,
      error: null,
      refresh: mockRefresh,
    }),
    useAppKit: () => ({
      isConnected: appKitState.isConnected,
      isInitializing: appKitState.isInitializing,
      address: appKitState.address,
      chain: appKitState.chain,
      connectSolana: mockConnect,
      openModal: vi.fn(),
    }),
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en' as const,
    }),
  };
});

describe('CollectiblesPage My Cards disconnected state', () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    mockConnect.mockReset();
    appKitState = {
      isConnected: false,
      isInitializing: false,
      address: null,
      chain: null,
    };
  });

  it('shows only connect state without empty grid when wallet is disconnected', async () => {
    render(<CollectiblesPage />);

    fireEvent.click(screen.getByTestId('collectibles-tab-my-cards'));

    await waitFor(() => {
      expect(screen.getByTestId('collectibles-my-cards-disconnected')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('collectibles-catalog-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('collectibles-catalog-grid')).not.toBeInTheDocument();
  });

  it('does not treat an active EVM address as My Cards holder filter', async () => {
    appKitState = {
      isConnected: true,
      isInitializing: false,
      address: '0x1234567890123456789012345678901234567890',
      chain: { chainNamespace: 'eip155' },
    };

    render(<CollectiblesPage />);
    fireEvent.click(screen.getByTestId('collectibles-tab-my-cards'));

    await waitFor(() => {
      expect(screen.getByTestId('collectibles-my-cards-disconnected')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('collectibles-catalog-grid')).not.toBeInTheDocument();
  });

  it('filters My Cards by connected Solana address', async () => {
    appKitState = {
      isConnected: true,
      isInitializing: false,
      address: 'BuyerSol1111111111111111111111111111111',
      chain: { chainNamespace: 'solana' },
    };

    render(<CollectiblesPage />);
    fireEvent.click(screen.getByTestId('collectibles-tab-my-cards'));

    await waitFor(() => {
      expect(screen.getByTestId('collectibles-catalog-grid')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('collectibles-my-cards-disconnected')).not.toBeInTheDocument();
  });
});
