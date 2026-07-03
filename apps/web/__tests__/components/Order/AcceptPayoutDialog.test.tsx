import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { DisplayDispute } from '@mobazha/core/types/orderDisplay';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
  isDisputeRulingAvailable: () => true,
}));

vi.mock('@/components/Order/cards/DisputeRulingSummary', () => ({
  DisputeRulingSummary: () => <div data-testid="dispute-ruling-summary" />,
}));

vi.mock('@/components/ui', () => ({
  AlertDialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="alert-dialog-root">
        {children}
        <button
          type="button"
          data-testid="alert-dialog-overlay-close"
          onClick={() => onOpenChange?.(false)}
        >
          overlay-close
        </button>
      </div>
    ) : null,
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
  }) => (
    <button type="button" data-testid="accept-payout-confirm" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({
    children,
    disabled,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button type="button" data-testid="accept-payout-cancel" disabled={disabled}>
      {children}
    </button>
  ),
  AlertDialogContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    'data-testid'?: string;
  }) => <div data-testid={props['data-testid']}>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { AcceptPayoutDialog } from '@/components/Order/AcceptPayoutDialog';

const mockDispute: DisplayDispute = {
  id: 'dispute-1',
  claim: 'Item not received',
  initiator: 'buyer',
  status: 'resolved',
  resolution: 'buyer',
  buyerPayoutPercent: 100,
  vendorPayoutPercent: 0,
  resolutionText: 'Full refund to buyer',
};

describe('AcceptPayoutDialog', () => {
  it('renders ruling summary and release hint when open', () => {
    render(
      <AcceptPayoutDialog
        open
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        isModerated
        dispute={mockDispute}
      />
    );

    expect(screen.getByTestId('accept-payout-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dispute-ruling-summary')).toBeInTheDocument();
    expect(screen.getByText('order.dialogs.acceptPayout.releaseHint')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <AcceptPayoutDialog
        open
        onOpenChange={() => undefined}
        onConfirm={onConfirm}
        dispute={mockDispute}
      />
    );

    fireEvent.click(screen.getByTestId('accept-payout-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables actions and shows phase label while loading', () => {
    render(
      <AcceptPayoutDialog
        open
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        isLoading
        acceptPayoutPhase="releasing"
        isModerated
        dispute={mockDispute}
      />
    );

    expect(screen.getByTestId('accept-payout-confirm')).toBeDisabled();
    expect(screen.getByTestId('accept-payout-cancel')).toBeDisabled();
    expect(screen.getByText('order.acceptPayout.phase.releasing')).toBeInTheDocument();
    expect(screen.getByText('order.acceptPayout.phase.releasingHint')).toBeInTheDocument();
  });

  it('does not call onConfirm again while loading', () => {
    const onConfirm = vi.fn();
    render(
      <AcceptPayoutDialog
        open
        onOpenChange={() => undefined}
        onConfirm={onConfirm}
        isLoading
        dispute={mockDispute}
      />
    );

    fireEvent.click(screen.getByTestId('accept-payout-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
