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

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/layouts', () => ({
  VStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    collectiblesApi: {
      ...actual.collectiblesApi,
      listMyCollectibleSourceDeposits: (...args: unknown[]) => mockListDeposits(...args),
      submitMyCollectibleSourceDeposit: (...args: unknown[]) => mockSubmitDeposit(...args),
      shipMyCollectibleSourceDeposit: (...args: unknown[]) => mockShipMyDeposit(...args),
    },
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en' as const,
    }),
  };
});

describe('CollectibleCardSubmissionsWorkspace', () => {
  beforeEach(() => {
    mockListDeposits.mockReset();
    mockSubmitDeposit.mockReset();
    mockShipMyDeposit.mockReset();
    mockToast.mockReset();
    mockListDeposits.mockResolvedValue({ items: [] });
    mockSubmitDeposit.mockResolvedValue({ sourceDepositID: 'dep-1' });
    mockShipMyDeposit.mockResolvedValue({ sourceDepositID: 'dep-redeem', status: 'shipped' });
  });

  it('disables submit until required fields and distinct http(s) URLs are valid', async () => {
    render(<CollectibleCardSubmissionsWorkspace enabled />);

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
    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.holderWallet'), {
      target: { value: 'wallet-abc' },
    });
    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.photoFrontUrl'), {
      target: { value: 'https://example.com/front.jpg' },
    });
    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.photoBackUrl'), {
      target: { value: 'https://example.com/back.jpg' },
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('resets all fields after successful submit', async () => {
    render(<CollectibleCardSubmissionsWorkspace enabled />);

    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.certNumber'), {
      target: { value: 'PSA-123' },
    });
    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.grade'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.holderWallet'), {
      target: { value: 'wallet-abc' },
    });
    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.photoFrontUrl'), {
      target: { value: 'https://example.com/front.jpg' },
    });
    fireEvent.change(screen.getByLabelText('marketplace.sell.collectibles.workspace.photoBackUrl'), {
      target: { value: 'https://example.com/back.jpg' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'marketplace.sell.collectibles.workspace.submitCard' })
    );

    await waitFor(() => {
      expect(mockSubmitDeposit).toHaveBeenCalledWith({
        certNumber: 'PSA-123',
        grade: '10',
        holderWallet: 'wallet-abc',
        photos: ['https://example.com/front.jpg', 'https://example.com/back.jpg'],
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('marketplace.sell.collectibles.workspace.certNumber')).toHaveValue('');
      expect(screen.getByLabelText('marketplace.sell.collectibles.workspace.holderWallet')).toHaveValue('');
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

  it('does not show ship panel unless deposit status is redeem_requested', async () => {
    mockListDeposits.mockResolvedValue({
      items: [
        {
          sourceDepositID: 'dep-held',
          certNumber: 'PSA-8',
          status: 'source_held',
        },
        {
          sourceDepositID: 'dep-redeem',
          certNumber: 'PSA-7',
          status: 'redeem_requested',
        },
      ],
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    await waitFor(() => {
      expect(screen.getAllByTestId('collectible-submission-row')).toHaveLength(2);
    });

    expect(screen.queryAllByTestId('source-deposit-ship-panel')).toHaveLength(1);
  });

  it('disables mark shipped until tracking number is provided', async () => {
    mockListDeposits.mockResolvedValue({
      items: [
        {
          sourceDepositID: 'dep-redeem',
          certNumber: 'PSA-7',
          status: 'redeem_requested',
        },
      ],
    });

    render(<CollectibleCardSubmissionsWorkspace enabled />);

    const markShippedButton = await screen.findByRole('button', {
      name: 'marketplace.sell.collectibles.workspace.markShipped',
    });
    expect(markShippedButton).toBeDisabled();

    fireEvent.change(screen.getByTestId('source-deposit-tracking-input'), {
      target: { value: 'TRK-123' },
    });

    await waitFor(() => {
      expect(markShippedButton).not.toBeDisabled();
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

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        description: 'marketplace.sell.collectibles.workspace.shipSuccess',
      })
    );
  });

  it('shows holder wallet custody hint instead of first-sale receiver copy', () => {
    render(<CollectibleCardSubmissionsWorkspace enabled />);

    expect(
      screen.getByText('marketplace.sell.collectibles.workspace.holderWalletHint')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('marketplace.sell.collectibles.workspace.holderWalletPlaceholder')
    ).toBeInTheDocument();
  });
});
