// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CollectibleCardSubmissionsWorkspace } from '@/components/CommunityMarketplace/CollectibleCardSubmissionsWorkspace';

const mockListDeposits = vi.fn();
const mockSubmitDeposit = vi.fn();
const mockShipMyDeposit = vi.fn();
const mockToast = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
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
  SourceDepositCollateralFundingSection: () => (
    <div data-testid="source-deposit-collateral-funding-section" />
  ),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  const actualActions = actual.useCollectibleActions();
  const collectibleActions = {
    ...actualActions,
    listMyCollectibleSourceDeposits: (...args: unknown[]) => mockListDeposits(...args),
    submitMyCollectibleSourceDeposit: (...args: unknown[]) => mockSubmitDeposit(...args),
    shipMyCollectibleSourceDeposit: (...args: unknown[]) => mockShipMyDeposit(...args),
  };
  return {
    ...actual,
    useCollectibleActions: () => collectibleActions,
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en' as const,
    }),
  };
});

describe('CollectibleCardSubmissionsWorkspace', () => {
  async function openSubmitTab() {
    fireEvent.click(screen.getByTestId('collectible-workspace-tab-submit'));
    await waitFor(() => {
      expect(
        screen.getByLabelText('marketplace.sell.collectibles.workspace.certNumber')
      ).toBeInTheDocument();
    });
  }

  beforeEach(() => {
    mockListDeposits.mockReset();
    mockSubmitDeposit.mockReset();
    mockShipMyDeposit.mockReset();
    mockToast.mockReset();
    mockListDeposits.mockResolvedValue({ items: [] });
    mockSubmitDeposit.mockResolvedValue({ sourceDepositID: 'dep-1' });
    mockShipMyDeposit.mockResolvedValue({ sourceDepositID: 'dep-redeem', status: 'shipped' });
  });

  it('renders required holder and optional guarantee fields without an account funding card', async () => {
    render(<CollectibleCardSubmissionsWorkspace enabled />);
    await openSubmitTab();

    expect(
      screen.queryByLabelText('marketplace.sell.collectibles.workspace.guaranteeAmount')
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('marketplace.sell.collectibles.workspace.holderWallet')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('source-deposit-collateral-funding-section')
    ).not.toBeInTheDocument();
  });

  it('disables submit until required identity and evidence fields are valid', async () => {
    render(<CollectibleCardSubmissionsWorkspace enabled />);
    await openSubmitTab();

    const submitButton = screen.getByRole('button', {
      name: 'marketplace.sell.collectibles.workspace.submitCard',
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.certNumber'), {
      target: { value: 'PSA-123' },
    });
    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.grade'), {
      target: { value: '10' },
    });
    fireEvent.change(
      screen.getByLabelText('marketplace.sell.collectibles.workspace.holderWallet'),
      {
        target: { value: 'holder-wallet-1' },
      }
    );
    fireEvent.change(
      screen.getByLabelText('marketplace.sell.collectibles.workspace.photoFrontUrl'),
      {
        target: { value: 'https://example.com/front.jpg' },
      }
    );
    fireEvent.change(
      screen.getByLabelText('marketplace.sell.collectibles.workspace.photoBackUrl'),
      {
        target: { value: 'https://example.com/back.jpg' },
      }
    );

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('submits a required holder snapshot without an optional guarantee declaration', async () => {
    render(<CollectibleCardSubmissionsWorkspace enabled />);
    await openSubmitTab();

    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.certNumber'), {
      target: { value: 'PSA-123' },
    });
    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.grade'), {
      target: { value: '10' },
    });
    fireEvent.change(
      screen.getByLabelText('marketplace.sell.collectibles.workspace.holderWallet'),
      {
        target: { value: 'holder-wallet-1' },
      }
    );
    fireEvent.change(
      screen.getByLabelText('marketplace.sell.collectibles.workspace.photoFrontUrl'),
      {
        target: { value: 'https://example.com/front.jpg' },
      }
    );
    fireEvent.change(
      screen.getByLabelText('marketplace.sell.collectibles.workspace.photoBackUrl'),
      {
        target: { value: 'https://example.com/back.jpg' },
      }
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'marketplace.sell.collectibles.workspace.submitCard' })
    );

    await waitFor(() => {
      expect(mockSubmitDeposit).toHaveBeenCalledWith({
        certNumber: 'PSA-123',
        holderWallet: 'holder-wallet-1',
        grade: '10',
        photos: ['https://example.com/front.jpg', 'https://example.com/back.jpg'],
      });
    });
  });

  it('renders history cards without primary actions', async () => {
    mockListDeposits.mockResolvedValue({
      items: [
        {
          sourceDepositID: 'dep-held',
          certNumber: 'PSA-8',
          hubSlotID: 'slot-held',
          status: 'source_held',
        },
        { sourceDepositID: 'dep-closed', certNumber: 'PSA-6', status: 'settled' },
      ],
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    await waitFor(() => {
      expect(screen.getAllByTestId('collectible-submission-row')).toHaveLength(2);
    });

    expect(
      screen.queryByRole('link', {
        name: 'marketplace.sell.collectibles.workspace.createListingCta',
      })
    ).toHaveAttribute('href', expect.stringContaining('dep-held'));

    const historyRow = screen
      .getByText('PSA-6')
      .closest('[data-testid="collectible-submission-row"]');
    expect(historyRow).toBeTruthy();
    expect(
      historyRow?.querySelector('[data-testid="create-listing-from-deposit"]')
    ).not.toBeInTheDocument();
    expect(
      historyRow?.querySelector('[data-testid="source-deposit-mark-shipped"]')
    ).not.toBeInTheDocument();
  });

  it('renders a single current status block instead of repeated status rows', async () => {
    mockListDeposits.mockResolvedValue({
      items: [
        {
          sourceDepositID: 'dep-held',
          certNumber: 'PSA-8',
          hubSlotID: 'slot-held',
          status: 'source_held',
        },
      ],
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    await waitFor(() => {
      expect(screen.getByTestId('seller-custody-current-status')).toBeInTheDocument();
    });

    const row = screen.getByTestId('collectible-submission-row');
    expect(row.querySelectorAll('[data-testid="seller-custody-current-status"]')).toHaveLength(1);
  });

  it('prioritizes redeem_requested as next action over source_held and history', async () => {
    mockListDeposits.mockResolvedValue({
      items: [
        { sourceDepositID: 'dep-held', certNumber: 'PSA-8', status: 'source_held' },
        { sourceDepositID: 'dep-redeem', certNumber: 'PSA-7', status: 'redeem_requested' },
        { sourceDepositID: 'dep-closed', certNumber: 'PSA-6', status: 'settled' },
      ],
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    await waitFor(() => {
      const rows = screen.getAllByTestId('collectible-submission-row');
      expect(rows[0]).toHaveTextContent('PSA-7');
    });
  });

  it('shows create listing action for source_held deposits', async () => {
    mockListDeposits.mockResolvedValue({
      items: [
        {
          sourceDepositID: 'dep-held',
          certNumber: 'PSA-9',
          hubSlotID: 'slot-held',
          grade: '10',
          serial: '001',
          status: 'source_held',
        },
      ],
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    await waitFor(() => {
      expect(
        screen.getByRole('link', {
          name: 'marketplace.sell.collectibles.workspace.createListingCta',
        })
      ).toHaveAttribute(
        'href',
        '/listing/new?sourceDepositID=dep-held&certNumber=PSA-9&hubSlotID=slot-held&grade=10&serial=001'
      );
    });
  });

  it('calls seller ship endpoint and refreshes submissions after mark shipped', async () => {
    let afterShip = false;
    mockListDeposits.mockImplementation(async () => {
      if (afterShip) {
        return {
          items: [
            {
              sourceDepositID: 'dep-redeem',
              certNumber: 'PSA-7',
              status: 'shipped',
              trackingNo: 'TRK-123',
            },
          ],
        };
      }
      return {
        items: [
          {
            sourceDepositID: 'dep-redeem',
            certNumber: 'PSA-7',
            status: 'redeem_requested',
          },
        ],
      };
    });
    mockShipMyDeposit.mockImplementation(async () => {
      afterShip = true;
      return { sourceDepositID: 'dep-redeem', status: 'shipped', trackingNo: 'TRK-123' };
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    fireEvent.change(await screen.findByTestId('source-deposit-tracking-input'), {
      target: { value: 'TRK-123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'marketplace.sell.collectibles.workspace.markShipped' })
    );

    await waitFor(() => {
      expect(mockShipMyDeposit).toHaveBeenCalledWith('dep-redeem', { trackingNo: 'TRK-123' });
      expect(mockListDeposits.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('keeps one expanded next-action card and compact secondary cases until expanded', async () => {
    mockListDeposits.mockResolvedValue({
      items: [
        { sourceDepositID: 'dep-redeem', certNumber: 'PSA-7', status: 'redeem_requested' },
        { sourceDepositID: 'dep-held', certNumber: 'PSA-8', status: 'source_held' },
        { sourceDepositID: 'dep-closed', certNumber: 'PSA-6', status: 'settled' },
      ],
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    await waitFor(() => {
      expect(screen.getAllByTestId('collectible-submission-row')).toHaveLength(3);
    });

    const rows = screen.getAllByTestId('collectible-submission-row');
    expect(rows[0]).toHaveTextContent('PSA-7');
    expect(rows[0]).not.toHaveAttribute('data-compact', 'true');
    expect(screen.getByTestId('source-deposit-ship-panel')).toBeInTheDocument();

    expect(rows[1]).toHaveAttribute('data-compact', 'true');
    expect(
      rows[1].querySelector('[data-testid="seller-custody-current-status"]')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('seller-custody-expand')[0]);
    expect(screen.getByTestId('seller-custody-expanded-details')).toBeInTheDocument();

    expect(rows[2]).toHaveAttribute('data-compact', 'true');
    expect(
      rows[2].querySelector('[data-testid="create-listing-from-deposit"]')
    ).not.toBeInTheDocument();
  });

  function buildDeposits(count: number, status: string, prefix: string) {
    return Array.from({ length: count }, (_, index) => ({
      sourceDepositID: `${prefix}-${index}`,
      certNumber: `PSA-${prefix}-${index}`,
      status,
    }));
  }

  it('limits active and history compact rows until show-all is clicked', async () => {
    mockListDeposits.mockResolvedValue({
      items: [
        { sourceDepositID: 'dep-next', certNumber: 'PSA-NEXT', status: 'redeem_requested' },
        ...buildDeposits(6, 'source_held', 'active'),
        ...buildDeposits(6, 'settled', 'history'),
      ],
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    await waitFor(() => {
      expect(screen.getAllByTestId('collectible-submission-row')).toHaveLength(11);
    });

    const activeRows = screen
      .getAllByTestId('collectible-submission-row')
      .filter(
        row =>
          row.getAttribute('data-compact') === 'true' && row.textContent?.includes('PSA-active')
      );
    expect(activeRows).toHaveLength(5);

    const historyRows = screen
      .getAllByTestId('collectible-submission-row')
      .filter(
        row =>
          row.getAttribute('data-compact') === 'true' && row.textContent?.includes('PSA-history')
      );
    expect(historyRows).toHaveLength(5);

    expect(screen.getByTestId('seller-custody-active-toggle')).toHaveTextContent(
      'marketplace.sell.collectibles.workspace.showAllCases'
    );
    expect(screen.getByTestId('seller-custody-history-toggle')).toHaveTextContent(
      'marketplace.sell.collectibles.workspace.showAllCases'
    );

    fireEvent.click(screen.getByTestId('seller-custody-active-toggle'));
    expect(
      screen
        .getAllByTestId('collectible-submission-row')
        .filter(row => row.textContent?.includes('PSA-active')).length
    ).toBe(6);
    expect(screen.getByTestId('seller-custody-active-toggle')).toHaveTextContent(
      'marketplace.sell.collectibles.workspace.showFewerCases'
    );

    fireEvent.click(screen.getByTestId('seller-custody-active-toggle'));
    expect(
      screen
        .getAllByTestId('collectible-submission-row')
        .filter(row => row.textContent?.includes('PSA-active')).length
    ).toBe(5);

    fireEvent.click(screen.getByTestId('seller-custody-history-toggle'));
    expect(
      screen
        .getAllByTestId('collectible-submission-row')
        .filter(row => row.textContent?.includes('PSA-history')).length
    ).toBe(6);
  });
});
