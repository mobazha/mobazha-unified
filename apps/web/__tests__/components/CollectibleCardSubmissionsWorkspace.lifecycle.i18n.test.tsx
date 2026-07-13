// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { getTranslation, setLocale } from '@mobazha/core';
import { CollectibleCardSubmissionsWorkspace } from '@/components/CommunityMarketplace/CollectibleCardSubmissionsWorkspace';

const mockListDeposits = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild: _asChild,
    ...props
  }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean; asChild?: boolean }>) => (
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/layouts', () => ({
  VStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/collectibles/SourceDepositCollateralFundingSection', () => ({
  SourceDepositCollateralFundingSection: () => null,
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  const actualActions = actual.useCollectibleActions();
  const collectibleActions = {
    ...actualActions,
    listMyCollectibleSourceDeposits: (...args: unknown[]) => mockListDeposits(...args),
  };
  return {
    ...actual,
    useCollectibleActions: () => collectibleActions,
    useI18n: () => ({
      t: (key: string) => actual.getTranslation(key),
      locale: actual.getLocale(),
    }),
  };
});

describe('CollectibleCardSubmissionsWorkspace lifecycle i18n', () => {
  beforeEach(() => {
    mockListDeposits.mockReset();
    mockListDeposits.mockResolvedValue({ items: [] });
    setLocale('zh');
  });

  it('renders localized custody timeline on an active card', async () => {
    mockListDeposits.mockResolvedValue({
      items: [{ sourceDepositID: 'dep-1', certNumber: 'PSA-9', grade: '10', status: 'submitted' }],
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    await screen.findByTestId('collectible-submission-row');

    const steps = [
      getTranslation('marketplace.sell.collectibles.workspace.lifecycle.submit'),
      getTranslation('marketplace.sell.collectibles.workspace.lifecycle.review'),
      getTranslation('marketplace.sell.collectibles.workspace.lifecycle.list'),
      getTranslation('marketplace.sell.collectibles.workspace.lifecycle.listed'),
      getTranslation('marketplace.sell.collectibles.workspace.lifecycle.redeem'),
    ];

    for (const label of steps) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
